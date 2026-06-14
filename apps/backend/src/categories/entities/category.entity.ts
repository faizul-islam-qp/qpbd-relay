import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 100 })
  name: string

  @Column({ length: 10 })
  icon: string

  @Column({ default: 0, name: 'sort_order' })
  sortOrder: number

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
