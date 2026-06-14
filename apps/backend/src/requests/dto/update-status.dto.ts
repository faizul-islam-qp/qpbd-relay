import { IsString, IsIn, IsOptional } from 'class-validator'

export class UpdateStatusDto {
  @IsIn(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'REJECTED', 'CANCELLED'])
  status: string

  @IsOptional()
  @IsString()
  note?: string
}

export class AssignDto {
  @IsString()
  staffId: string
}
