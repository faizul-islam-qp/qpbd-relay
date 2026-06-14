import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm'
import { Request } from './request.entity'
import { User } from '../../users/entities/user.entity'

@Entity('request_comments')
export class RequestComment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'request_id' })
  requestId: string

  @ManyToOne(() => Request, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: Request

  @Column({ name: 'author_id', nullable: true })
  authorId: string

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author: User

  @Column('text')
  content: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
