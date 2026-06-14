import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Category } from './entities/category.entity'

const DEFAULT_CATEGORIES = [
  { name: 'Tea / Coffee', icon: '☕', sortOrder: 1 },
  { name: 'Chanachur / Snacks', icon: '🍿', sortOrder: 2 },
  { name: 'Office Supplies', icon: '🖨️', sortOrder: 3 },
  { name: 'Maintenance', icon: '🔧', sortOrder: 4 },
  { name: 'IT Support', icon: '💻', sortOrder: 5 },
  { name: 'Delivery / Courier', icon: '📦', sortOrder: 6 },
  { name: 'Transport', icon: '🚗', sortOrder: 7 },
  { name: 'Other', icon: '❓', sortOrder: 8 },
]

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(@InjectRepository(Category) private repo: Repository<Category>) {}

  async onModuleInit() {
    const count = await this.repo.count()
    if (count === 0) {
      await this.repo.save(DEFAULT_CATEGORIES.map((c) => this.repo.create(c)))
      console.log('[Seed] Categories seeded')
    }
  }

  findAll(onlyActive = true) {
    return this.repo.find({
      where: onlyActive ? { isActive: true } : {},
      order: { sortOrder: 'ASC' },
    })
  }

  create(data: Partial<Category>) {
    return this.repo.save(this.repo.create(data))
  }

  async update(id: string, data: Partial<Category>) {
    await this.repo.update(id, data)
    return this.repo.findOne({ where: { id } })
  }

  async remove(id: string) {
    await this.repo.update(id, { isActive: false })
    return { success: true }
  }
}
