import { IsString, Matches } from 'class-validator'

export class SendOtpDto {
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Invalid phone number' })
  phone: string
}

export class VerifyOtpDto {
  @IsString()
  phone: string

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'OTP must be 6 digits' })
  otp: string
}
