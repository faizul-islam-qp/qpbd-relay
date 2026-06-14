import { Global, Module, forwardRef } from '@nestjs/common'
import { TelegramService } from './telegram.service'
import { UsersModule } from '../users/users.module'

@Global()
@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
