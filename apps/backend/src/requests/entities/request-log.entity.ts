import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Request } from './request.entity'
import { User } from '../../users/entities/user.entity'

@Entity('request_logs')
export class RequestLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'request_id' })
  requestId: string

  @ManyToOne(() => Request, (req) => req.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: Request

  @Column({ name: 'actor_id' })
  actorId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_id' })
  actor: User

  @Column({ nullable: true, name: 'old_status' })
  oldStatus: string

  @Column({ name: 'new_status' })
  newStatus: string

  @Column({ type: 'text', nullable: true })
  note: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
