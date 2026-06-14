import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator'

export class CreateRequestDto {
  @IsUUID()
  categoryId: string

  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string
}
