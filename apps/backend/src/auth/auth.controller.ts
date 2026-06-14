import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { TelegramService } from '../telegram/telegram.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto, SendEmailOtpDto } from './dto/register.dto'
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { GetUser } from '../common/decorators/get-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private telegramService: TelegramService,
  ) {}

  @Post('register/email-otp')
  sendEmailOtp(@Body() dto: SendEmailOtpDto) {
    return this.authService.sendEmailOtp(dto.email)
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('staff/otp/send')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone)
  }

  @Post('staff/otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@GetUser() user: any) {
    return user
  }

  @Get('telegram-bot')
  telegramBot() {
    return {
      configured: this.telegramService.isBotConfigured(),
      botUsername: this.telegramService.getBotUsername(),
    }
  }
}
