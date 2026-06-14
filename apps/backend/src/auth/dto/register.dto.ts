import { IsEmail, IsString, MinLength, Matches, IsOptional } from 'class-validator'

export class RegisterDto {
  @IsString()
  name: string

  @IsEmail()
  @Matches(/@questionpro\.com$/, { message: 'Only @questionpro.com email addresses allowed' })
  email: string

  @IsString()
  @MinLength(6)
  password: string

  @IsOptional()
  @IsString()
  otp?: string
}

export class SendEmailOtpDto {
  @IsEmail()
  @Matches(/@questionpro\.com$/, { message: 'Only @questionpro.com email addresses allowed' })
  email: string
}
