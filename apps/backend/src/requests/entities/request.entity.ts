import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Category } from '../../categories/entities/category.entity'
import { RequestLog } from './request-log.entity'

export enum RequestStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum RequestPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('requests')
export class Request {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'employee_id' })
  employeeId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employee_id' })
  employee: User

  @Column({ name: 'category_id' })
  categoryId: string

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category

  @Column({ length: 255 })
  title: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ type: 'varchar', default: RequestPriority.NORMAL })
  priority: RequestPriority

  @Column({ type: 'varchar', default: RequestStatus.PENDING })
  status: RequestStatus

  @Column({ nullable: true, name: 'assigned_to' })
  assignedTo: string

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee: User

  @Column({ nullable: true, name: 'photo_url' })
  photoUrl: string

  @OneToMany(() => RequestLog, (log) => log.request)
  logs: RequestLog[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
