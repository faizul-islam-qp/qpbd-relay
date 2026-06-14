import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
  STAFF = 'staff',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 100 })
  name: string

  @Column({ nullable: true, unique: true })
  email: string

  @Column({ nullable: true, unique: true })
  phone: string

  @Column({ nullable: true, name: 'telegram_chat_id' })
  telegramChatId: string

  @Column({ type: 'varchar', length: 20 })
  role: UserRole

  @Column({ nullable: true, name: 'password_hash', select: false })
  passwordHash: string

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
