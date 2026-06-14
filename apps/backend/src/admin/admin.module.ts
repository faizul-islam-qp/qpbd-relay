import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Request } from '../requests/entities/request.entity'
import { AdminService } from './admin.service'
import { AdminController } from './admin.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Request])],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
