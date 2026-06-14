import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ nullable: true, name: 'request_id' })
  requestId: string

  @Column({ length: 255 })
  title: string

  @Column({ type: 'text', nullable: true })
  body: string

  @Column({ default: false, name: 'is_read' })
  isRead: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
