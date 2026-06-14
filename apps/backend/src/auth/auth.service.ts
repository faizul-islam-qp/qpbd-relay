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

const OTP_TTL_MS = 5 * 60 * 1000   // 5 minutes
const OTP_COOLDOWN_MS = 60 * 1000  // 1 minute

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private telegramService: TelegramService,
    @InjectRepository(OtpEntry) private otpRepo: Repository<OtpEntry>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) throw new ConflictException('Email already registered')

    if (!dto.email.endsWith('@questionpro.com')) {
      throw new BadRequestException('Only @questionpro.com emails allowed')
    }

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

  async sendOtp(phone: string) {
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

    const sent = await this.telegramService.sendOtp(user.telegramChatId, code)

    console.log(`[OTP] Phone: ${phone} | Code: ${code} | Telegram: ${sent ? 'sent' : 'not configured'}`)

    return {
      message: sent ? 'OTP sent via Telegram' : 'OTP logged (Telegram not configured)',
      ...(process.env.NODE_ENV !== 'production' && { debug_otp: code }),
    }
  }

  async verifyOtp(phone: string, otp: string) {
    const user = await this.usersService.findByPhone(phone)
    if (!user || user.role !== UserRole.STAFF) throw new UnauthorizedException()

    const entry = await this.otpRepo.findOne({
      where: { phone, code: otp, expiresAt: MoreThan(new Date()) },
    })
    if (!entry) throw new UnauthorizedException('Invalid or expired OTP')

    await this.otpRepo.delete({ phone })
    return this.issueToken(user)
  }

  private issueToken(user: User) {
    const payload = { sub: user.id, email: user.email, phone: user.phone, role: user.role, name: user.name }
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    }
  }
}
