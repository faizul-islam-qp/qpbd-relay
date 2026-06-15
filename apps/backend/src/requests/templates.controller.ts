import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RequestTemplate } from './entities/request-template.entity'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { GetUser } from '../common/decorators/get-user.decorator'

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(@InjectRepository(RequestTemplate) private repo: Repository<RequestTemplate>) {}

  @Get()
  list(@GetUser() user: any) {
    return this.repo.find({ where: { userId: user.id }, order: { createdAt: 'DESC' } })
  }

  @Post()
  create(@GetUser() user: any, @Body() dto: { name: string; title: string; description?: string; categoryId?: string; priority?: string }) {
    const t = this.repo.create({ userId: user.id, ...dto, priority: dto.priority || 'NORMAL' })
    return this.repo.save(t)
  }

  @Delete(':id')
  async remove(@GetUser() user: any, @Param('id') id: string) {
    await this.repo.delete({ id, userId: user.id })
    return { success: true }
  }
}
