import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Notification } from './entities/notification.entity'

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private repo: Repository<Notification>) {}

  async create(userId: string, data: { requestId?: string; title: string; body?: string }) {
    return this.repo.save(this.repo.create({ userId, ...data }))
  }

  async findForUser(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { data, total }
  }

  async markRead(id: string, userId: string) {
    await this.repo.update({ id, userId }, { isRead: true })
    return { success: true }
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, isRead: false }, { isRead: true })
    return { success: true }
  }

  async countUnread(userId: string) {
    return this.repo.count({ where: { userId, isRead: false } })
  }
}
