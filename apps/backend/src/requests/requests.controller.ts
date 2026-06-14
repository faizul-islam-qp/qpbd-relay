import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { RequestsService } from './requests.service'
import { CreateRequestDto } from './dto/create-request.dto'
import { UpdateStatusDto, AssignDto } from './dto/update-status.dto'
import { UpdateRequestDto } from './dto/update-request.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { GetUser } from '../common/decorators/get-user.decorator'

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private service: RequestsService) {}

  @Get()
  findAll(@GetUser() user: any, @Query() filters: any) {
    return this.service.findAll(user, filters)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('employee', 'admin')
  create(@GetUser() user: any, @Body() dto: CreateRequestDto) {
    return this.service.create(user.id, dto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('employee', 'admin')
  updateOwn(@Param('id') id: string, @GetUser() user: any, @Body() dto: UpdateRequestDto) {
    return this.service.updateByEmployee(id, user.id, dto)
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('employee', 'admin')
  cancel(@Param('id') id: string, @GetUser() user: any) {
    return this.service.cancelByEmployee(id, user.id)
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  updateStatus(@Param('id') id: string, @GetUser() user: any, @Body() dto: UpdateStatusDto) {
    return this.service.updateStatus(id, user, dto.status, dto.note)
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  assign(@Param('id') id: string, @GetUser() user: any, @Body() dto: AssignDto) {
    return this.service.assign(id, user, dto.staffId)
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.service.getComments(id)
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @GetUser() user: any, @Body() dto: { content: string }) {
    return this.service.addComment(id, user.id, dto.content)
  }
}
