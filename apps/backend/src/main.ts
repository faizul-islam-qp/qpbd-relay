import 'reflect-metadata'
import { setDefaultResultOrder } from 'dns'
setDefaultResultOrder('ipv4first')
import * as pg from 'pg'
// pg reads `timestamp without timezone` in local TZ by default.
// Force UTC so dates are always consistent regardless of server locale.
pg.types.setTypeParser(1114, (str: string) => new Date(str + 'Z'))
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new HttpExceptionFilter())
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
  })
  const port = process.env.PORT || 3001
  await app.listen(port, '0.0.0.0')
  console.log(`🚀 Backend running on http://0.0.0.0:${port}/api`)
}
bootstrap()
