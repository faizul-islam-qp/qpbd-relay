import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ type: 'text', unique: true })
  endpoint: string

  @Column({ type: 'text' })
  p256dh: string

  @Column({ type: 'text' })
  auth: string

  @Column({ nullable: true, name: 'user_agent' })
  userAgent: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
