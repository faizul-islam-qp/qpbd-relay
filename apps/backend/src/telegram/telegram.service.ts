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
    this.initBot().catch(() => {})
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
        setTimeout(() => reject(new Error('getMe timeout')), 8000),
      );
      const me: any = await Promise.race([this.bot.getMe(), timeout]);
      this.botUsername = me.username;

      this.bot.on("message", async (msg: any) => {
        if (!msg.text?.startsWith("/start")) return;
        const chatId = String(msg.chat.id);
        const parts = msg.text.trim().split(/\s+/);
        const param = parts[1]; // phone digits from deep link, e.g. "8801712345678"

        if (param) {
          // Normalize: add + if missing
          const phone = param.startsWith("+") ? param : `+${param}`;
          try {
            const user = await this.usersService.findByPhone(phone);
            if (user && user.role === "staff") {
              await this.usersService.update(user.id, {
                telegramChatId: chatId,
              });
              await this.bot.sendMessage(
                chatId,
                `✅ *Wick Office*\n\nYour account has been linked!\nYou'll receive OTP codes here when you log in.`,
                { parse_mode: "Markdown" },
              );
              this.logger.log(`Chat ID ${chatId} linked to staff ${phone}`);
            } else {
              await this.bot.sendMessage(
                chatId,
                `⚠️ Phone number not found in the system.\nAsk your admin to add your account first.`,
              );
            }
          } catch (e) {
            this.logger.error("Error handling /start", e);
          }
        } else {
          // Plain /start — user opened bot manually
          await this.bot.sendMessage(
            chatId,
            `👋 *Welcome to Wick Office Bot!*\n\nTo link your account, use the button on the staff login page.`,
            { parse_mode: "Markdown" },
          );
        }
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
      this.logger.error(`Failed to send Telegram OTP to ${chatId}`, e);
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
