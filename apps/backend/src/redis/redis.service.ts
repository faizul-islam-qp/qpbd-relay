import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  client: Redis

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
    this.client.on('error', (err) => console.error('[Redis]', err))
    console.log('[Redis] Connected')
  }

  onModuleDestroy() {
    this.client.disconnect()
  }
}
