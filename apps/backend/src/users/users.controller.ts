import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CreateStaffDto, CreateEmployeeDto } from './dto/create-user.dto'
import { UserRole } from './entities/user.entity'
import * as bcrypt from 'bcrypt'

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Query('role') role?: string) {
    return this.usersService.findAll(role)
  }

  @Post('staff')
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.usersService.create({
      name: dto.name,
      phone: dto.phone,
      telegramChatId: dto.telegramChatId,
      role: UserRole.STAFF,
    })
  }

  @Post('employee')
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10)
    return this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: UserRole.EMPLOYEE,
    })
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const { password, ...rest } = body
    if (password) rest.passwordHash = await bcrypt.hash(password, 10)
    return this.usersService.update(id, rest)
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.usersService.update(id, { isActive: true })
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id)
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id)
  }
}
