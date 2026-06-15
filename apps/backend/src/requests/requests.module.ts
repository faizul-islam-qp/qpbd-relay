import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Request } from './entities/request.entity'
import { RequestLog } from './entities/request-log.entity'
import { RequestComment } from './entities/request-comment.entity'
import { User } from '../users/entities/user.entity'
import { RequestsService } from './requests.service'
import { RequestsController } from './requests.controller'
import { DisplayController } from './display.controller'
import { TemplatesController } from './templates.controller'
import { RequestTemplate } from './entities/request-template.entity'
import { EventsModule } from '../events/events.module'
import { PushModule } from '../push/push.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Request, RequestLog, RequestComment, User, RequestTemplate]),
    forwardRef(() => EventsModule),
    forwardRef(() => PushModule),
    NotificationsModule,
  ],
  providers: [RequestsService],
  controllers: [RequestsController, DisplayController, TemplatesController],
  exports: [RequestsService],
})
export class RequestsModule {}
