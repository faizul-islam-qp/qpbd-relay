import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('otps')
export class OtpEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  phone: string

  @Column()
  code: string

  @Column({ type: 'timestamptz' })
  expiresAt: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
