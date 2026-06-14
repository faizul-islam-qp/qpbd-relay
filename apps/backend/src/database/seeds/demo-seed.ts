import { NestFactory } from '@nestjs/core'
import { AppModule } from '../../app.module'
import { UsersService } from '../../users/users.service'
import { UserRole } from '../../users/entities/user.entity'
import * as bcrypt from 'bcrypt'

async function demoSeed() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const usersService = app.get(UsersService)

  await usersService.seedAdmin()
  console.log('[Demo] Admin seeded')

  const pwHash = await bcrypt.hash('password123', 10)

  for (const emp of [
    { name: 'Alice Rahman', email: 'alice@questionpro.com' },
    { name: 'Bob Hossain', email: 'bob@questionpro.com' },
  ]) {
    const ex = await usersService.findByEmail(emp.email)
    if (!ex) {
      await usersService.create({ ...emp, passwordHash: pwHash, role: UserRole.EMPLOYEE })
      console.log(`[Demo] Employee: ${emp.email}`)
    }
  }

  for (const staff of [
    { name: 'Karim Peon', phone: '+8801700000001', telegramChatId: '' },
    { name: 'Rahim Chai', phone: '+8801700000002', telegramChatId: '' },
  ]) {
    const ex = await usersService.findByPhone(staff.phone)
    if (!ex) {
      await usersService.create({ ...staff, role: UserRole.STAFF })
      console.log(`[Demo] Staff: ${staff.name}`)
    }
  }

  console.log('[Demo] Done. Staff OTP available in backend console logs.')
  await app.close()
}

demoSeed().catch(console.error)
