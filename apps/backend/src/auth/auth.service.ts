import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { User, UserRole } from '../users/entities/user.entity'
import { UsersService } from '../users/users.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { OtpEntry } from './entities/otp.entity'
import { TelegramService } from '../telegram/telegram.service'
import { EmailService } from '../email/email.service'

const OTP_TTL_MS = 5 * 60 * 1000   // 5 minutes
const OTP_COOLDOWN_MS = 60 * 1000  // 1 minute

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('880')) return '+' + digits
  if (digits.startsWith('0')) return '+88' + digits
  return '+880' + digits
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private telegramService: TelegramService,
    private emailService: EmailService,
    @InjectRepository(OtpEntry) private otpRepo: Repository<OtpEntry>,
  ) {}

  async sendEmailOtp(email: string) {
    const existing = await this.usersService.findByEmail(email)
    if (existing) throw new ConflictException('Email already registered')

    const cooldownSince = new Date(Date.now() - OTP_COOLDOWN_MS)
    const recent = await this.otpRepo.findOne({
      where: { phone: email, createdAt: MoreThan(cooldownSince) },
      order: { createdAt: 'DESC' },
    })
    if (recent) throw new BadRequestException('Please wait 60 seconds before requesting again')

    await this.otpRepo.delete({ phone: email })

    const code = crypto.randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)
    await this.otpRepo.save(this.otpRepo.create({ phone: email, code, expiresAt }))

    const sent = await this.emailService.sendOtp(email, code)
    console.log(`[Email OTP] ${email} | Code: ${code} | Sent: ${sent}`)

    return {
      message: sent ? 'Verification code sent to your email' : 'Email not configured — check console for code',
      ...(process.env.NODE_ENV !== 'production' && { debug_otp: code }),
    }
  }

  async register(dto: RegisterDto) {
    if (!dto.otp) throw new BadRequestException('Email verification required — send OTP first')

    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) throw new ConflictException('Email already registered')

    const entry = await this.otpRepo.findOne({
      where: { phone: dto.email, code: dto.otp, expiresAt: MoreThan(new Date()) },
    })
    if (!entry) throw new UnauthorizedException('Invalid or expired verification code')

    await this.otpRepo.delete({ phone: dto.email })

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: UserRole.EMPLOYEE,
    })

    return this.issueToken(user)
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email)
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials')
    if (!user.email.endsWith('@questionpro.com')) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    return this.issueToken(user)
  }

  async staffPasswordLogin(phone: string, password: string) {
    const normalized = normalizePhone(phone)
    const user = await this.usersService.findByPhoneWithPassword(normalized)
    if (!user || user.role !== UserRole.STAFF || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials')
    }
    if (!user.passwordHash) throw new UnauthorizedException('Password not set — use OTP login first')
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')
    return this.issueToken(user)
  }

  async setStaffPassword(userId: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10)
    await this.usersService.updatePassword(userId, passwordHash)
    return { success: true }
  }

  async sendOtp(phone: string) {
    const normalized = normalizePhone(phone)
    phone = normalized
    const user = await this.usersService.findByPhone(phone)
    if (!user || user.role !== UserRole.STAFF) {
      throw new UnauthorizedException('Phone number not registered as staff')
    }
    if (!user.isActive) throw new UnauthorizedException('Account deactivated')

    // Cooldown: block if OTP sent within last 60s
    const cooldownSince = new Date(Date.now() - OTP_COOLDOWN_MS)
    const recent = await this.otpRepo.findOne({
      where: { phone, createdAt: MoreThan(cooldownSince) },
      order: { createdAt: 'DESC' },
    })
    if (recent) throw new BadRequestException('Please wait 60 seconds before requesting again')

    // Clean up expired OTPs for this phone
    await this.otpRepo.delete({ phone })

    const code = crypto.randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)
    await this.otpRepo.save(this.otpRepo.create({ phone, code, expiresAt }))

    const botReady = this.telegramService.isBotConfigured()
    const hasChatId = !!user.telegramChatId
    const sent = await this.telegramService.sendOtp(user.telegramChatId, code)

    console.log(`[OTP] Phone: ${phone} | Code: ${code} | Bot: ${botReady} | ChatId: ${hasChatId} | Sent: ${sent}`)

    let message: string
    if (sent) {
      message = 'OTP sent via Telegram'
    } else if (!botReady) {
      message = 'OTP ready (Telegram bot not configured)'
    } else if (!hasChatId) {
      message = 'Telegram not linked — open the bot and press Start first, then try again'
    } else {
      message = 'Failed to send via Telegram — check bot connectivity'
    }

    return {
      message,
      telegram_linked: hasChatId,
      ...(process.env.NODE_ENV !== 'production' && { debug_otp: code }),
    }
  }

  async verifyOtp(phone: string, otp: string) {
    const normalized = normalizePhone(phone)
    const user = await this.usersService.findByPhoneWithPassword(normalized)
    if (!user || user.role !== UserRole.STAFF) throw new UnauthorizedException()

    const entry = await this.otpRepo.findOne({
      where: { phone: normalized, code: otp, expiresAt: MoreThan(new Date()) },
    })
    if (!entry) throw new UnauthorizedException('Invalid or expired OTP')

    await this.otpRepo.delete({ phone: normalized })
    const token = this.issueToken(user)
    return { ...token, needs_password: !user.passwordHash }
  }

  private issueToken(user: User) {
    const payload = { sub: user.id, email: user.email, phone: user.phone, role: user.role, name: user.name }
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    }
  }
}
