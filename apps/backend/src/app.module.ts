import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { CategoriesModule } from './categories/categories.module'
import { RequestsModule } from './requests/requests.module'
import { PushModule } from './push/push.module'
import { NotificationsModule } from './notifications/notifications.module'
import { EventsModule } from './events/events.module'
import { AdminModule } from './admin/admin.module'
import { HealthModule } from './health/health.module'
import { TelegramModule } from './telegram/telegram.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    }),
    HealthModule,
    TelegramModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    RequestsModule,
    PushModule,
    NotificationsModule,
    EventsModule,
    AdminModule,
  ],
})
export class AppModule {}
