import { IsString, IsEmail, IsOptional, IsIn, Matches } from 'class-validator'

export class CreateStaffDto {
  @IsString()
  name: string

  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Invalid phone number' })
  phone: string

  @IsOptional()
  @IsString()
  telegramChatId?: string
}

export class CreateEmployeeDto {
  @IsString()
  name: string

  @IsEmail()
  @Matches(/@questionpro\.com$/, { message: 'Only @questionpro.com emails allowed' })
  email: string

  @IsString()
  password: string
}
