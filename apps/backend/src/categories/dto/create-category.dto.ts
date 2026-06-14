import { IsString, IsOptional, IsNumber } from 'class-validator'

export class CreateCategoryDto {
  @IsString()
  name: string

  @IsString()
  icon: string

  @IsOptional()
  @IsNumber()
  sortOrder?: number
}
