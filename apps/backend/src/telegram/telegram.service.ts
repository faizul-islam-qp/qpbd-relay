import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { UsersService } from "../users/users.service";

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: any;
  private botUsername: string | null = null;
  private readonly logger = new Logger(TelegramService.name);

  constructor(private usersService: UsersService) {}

  onModuleInit() {
    // Non-blocking — don't await so NestJS startup isn't delayed
    this.initBot().catch(() => {});
  }

  private async initBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn(
        "TELEGRAM_BOT_TOKEN not set — OTP will be logged to console only",
      );
      return;
    }
    try {
      const TelegramBot = require("node-telegram-bot-api");
      // Start with polling:false — validate token+network before enabling polling
      this.bot = new TelegramBot(token, { polling: false });

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("getMe timeout")), 8000),
      );
      const me: any = await Promise.race([this.bot.getMe(), timeout]);
      this.botUsername = me.username;

      // /start with optional deep-link param (e.g. /start 8801712345678)
      this.bot.onText(/\/start(?:\s+(.+))?/, async (msg: any, match: any) => {
        const chatId = String(msg.chat.id);
        const param = match?.[1]?.trim();

        this.logger.log(`/start received — param: ${param ? 'yes' : 'none'}`);

        if (param) {
          await this.linkPhone(chatId, param);
        } else {
          await this.bot.sendMessage(
            chatId,
            `👋 *Welcome to Wick Office Bot!*\n\nSend your phone number (e.g. \`+8801XXXXXXXXX\`) to link your account.`,
            { parse_mode: "Markdown" },
          );
        }
      });

      // Handle phone number messages for manual linking
      this.bot.on("message", async (msg: any) => {
        if (!msg.text || msg.text.startsWith("/")) return;
        const text = msg.text.trim();
        // Only handle if looks like a phone number
        if (!/^\+?\d{7,15}$/.test(text)) return;
        const chatId = String(msg.chat.id);
        this.logger.log(`Phone number message received, attempting link`);
        await this.linkPhone(chatId, text);
      });

      this.bot.on("polling_error", (err: any) => {
        if (err.code === "EFATAL") {
          this.logger.error("Telegram unreachable (EFATAL) — disabling bot");
          this.bot?.stopPolling().catch(() => {});
          this.bot = null;
          this.botUsername = null;
        } else {
          this.logger.error("Telegram polling error", err.message);
        }
      });

      await this.bot.startPolling();
      this.logger.log(
        `Telegram bot @${this.botUsername} initialized (polling)`,
      );
    } catch (e: any) {
      this.logger.error(
        "Failed to init Telegram bot — running without Telegram",
        e?.message ?? e,
      );
      this.bot = null;
      this.botUsername = null;
    }
  }

  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('880')) return '+' + digits
    if (digits.startsWith('0')) return '+88' + digits
    return '+880' + digits
  }

  private async linkPhone(chatId: string, param: string) {
    const phone = this.normalizePhone(param);
    try {
      const user = await this.usersService.findByPhone(phone);
      if (user && user.role === "staff") {
        await this.usersService.update(user.id, { telegramChatId: chatId });
        await this.bot.sendMessage(
          chatId,
          `✅ *Wick Office*\n\nAccount linked for *${user.name}*!\nYou'll receive OTP codes here when you log in.`,
          { parse_mode: "Markdown" },
        );
        this.logger.log(`Staff account linked via Telegram`);
      } else {
        this.logger.warn(`linkPhone: no staff found for given phone`);
        await this.bot.sendMessage(
          chatId,
          `⚠️ Phone number *${phone}* not found in the system.\nAsk your admin to add your account first.`,
          { parse_mode: "Markdown" },
        );
      }
    } catch (e) {
      this.logger.error("Error linking phone", e);
    }
  }

  async onModuleDestroy() {
    if (this.bot) {
      try {
        await this.bot.stopPolling();
      } catch {}
    }
  }

  getBotUsername(): string | null {
    // Runtime value from getMe() — or fallback to env var if bot failed to connect
    return this.botUsername ?? process.env.TELEGRAM_BOT_USERNAME ?? null;
  }

  isBotConfigured(): boolean {
    return !!this.bot;
  }

  async sendOtp(chatId: string, otp: string): Promise<boolean> {
    if (!this.bot || !chatId) return false;
    try {
      await this.bot.sendMessage(
        chatId,
        `🔐 *Your Wick Office OTP:* \`${otp}\`\n\nExpires in 5 minutes. Do not share this code.`,
        { parse_mode: "Markdown" },
      );
      return true;
    } catch (e) {
      this.logger.error(`Failed to send Telegram OTP`, e);
      return false;
    }
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.bot || !chatId) return false;
    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
      return true;
    } catch {
      return false;
    }
  }
}
