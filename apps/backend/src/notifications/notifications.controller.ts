import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { GetUser } from '../common/decorators/get-user.decorator'

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(@GetUser() user: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.findForUser(user.id, parseInt(page), parseInt(limit))
  }

  @Get('unread-count')
  unreadCount(@GetUser() user: any) {
    return this.service.countUnread(user.id).then((count) => ({ count }))
  }

  @Patch('read-all')
  markAllRead(@GetUser() user: any) {
    return this.service.markAllRead(user.id)
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @GetUser() user: any) {
    return this.service.markRead(id, user.id)
  }
}
