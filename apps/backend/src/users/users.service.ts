import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User, UserRole } from './entities/user.entity'

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async onModuleInit() {
    await this.seedAdmin()
  }

  async findAll(role?: string) {
    const where: any = {}
    if (role) where.role = role
    return this.repo.find({ where, order: { createdAt: 'DESC' } })
  }

  async findById(id: string) {
    return this.repo.findOne({ where: { id } })
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } })
  }

  async findByEmailWithPassword(email: string) {
    return this.repo.createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email })
      .getOne()
  }

  async findByPhone(phone: string) {
    return this.repo.findOne({ where: { phone } })
  }

  async create(data: Partial<User>) {
    const user = this.repo.create(data)
    return this.repo.save(user)
  }

  async update(id: string, data: Partial<User>) {
    await this.repo.update(id, data)
    return this.findById(id)
  }

  async deactivate(id: string) {
    await this.repo.update(id, { isActive: false })
    return { success: true }
  }

  async delete(id: string) {
    await this.repo.delete(id)
    return { success: true }
  }

  async findStaffWithChatId() {
    return this.repo.find({
      where: { role: UserRole.STAFF, isActive: true },
    })
  }

  async seedAdmin() {
    const email = process.env.ADMIN_EMAIL || 'admin@questionpro.com'
    const existing = await this.findByEmail(email)
    if (existing) return existing

    const bcrypt = require('bcrypt')
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@1234', 10)
    return this.create({
      name: process.env.ADMIN_NAME || 'Admin',
      email,
      passwordHash,
      role: UserRole.ADMIN,
    })
  }
}
