import { Controller, Get, Post, Delete, Body, Headers, UseGuards } from '@nestjs/common'
import { PushService } from './push.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { GetUser } from '../common/decorators/get-user.decorator'

@Controller('push')
export class PushController {
  constructor(private service: PushService) {}

  @Get('vapid-public-key')
  getVapidKey() {
    return this.service.getVapidPublicKey()
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(
    @GetUser() user: any,
    @Body() body: { endpoint: string; p256dh: string; auth: string },
    @Headers('user-agent') ua: string,
  ) {
    return this.service.subscribe(user.id, body, ua)
  }

  @Delete('unsubscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.service.unsubscribe(body.endpoint)
  }
}
