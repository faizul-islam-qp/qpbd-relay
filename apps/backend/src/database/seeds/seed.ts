import { NestFactory } from '@nestjs/core'
import { AppModule } from '../../app.module'
import { UsersService } from '../../users/users.service'

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const usersService = app.get(UsersService)
  const admin = await usersService.seedAdmin()
  console.log(`[Seed] Admin: ${admin.email}`)
  await app.close()
}

seed().catch(console.error)
