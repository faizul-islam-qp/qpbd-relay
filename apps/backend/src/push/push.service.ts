import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PushSubscription } from './entities/push-subscription.entity'
import * as webpush from 'web-push'

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name)

  constructor(@InjectRepository(PushSubscription) private repo: Repository<PushSubscription>) {}

  onModuleInit() {
    const pub = process.env.VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    const email = process.env.VAPID_EMAIL || 'mailto:admin@questionpro.com'
    if (pub && priv) {
      webpush.setVapidDetails(email, pub, priv)
      this.logger.log('Web Push (VAPID) initialized')
    } else {
      this.logger.warn('VAPID keys not set — push notifications disabled. Run: npm run generate:vapid')
    }
  }

  getVapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || null }
  }

  async subscribe(userId: string, sub: { endpoint: string; p256dh: string; auth: string }, userAgent?: string) {
    const existing = await this.repo.findOne({ where: { endpoint: sub.endpoint } })
    if (existing) {
      await this.repo.update(existing.id, { userId })
      return existing
    }
    return this.repo.save(this.repo.create({ userId, ...sub, userAgent }))
  }

  async unsubscribe(endpoint: string) {
    await this.repo.delete({ endpoint })
    return { success: true }
  }

  async notifyAllStaff(request: any) {
    if (!process.env.VAPID_PUBLIC_KEY) return

    const staffSubs = await this.repo
      .createQueryBuilder('ps')
      .innerJoin('ps.user', 'u')
      .where("u.role IN ('staff', 'admin')")
      .andWhere('u.isActive = true')
      .getMany()

    const payload = JSON.stringify({
      title: `New Request: ${request.title}`,
      body: `${request.category?.icon || ''} ${request.category?.name || ''} — ${request.priority}`,
      url: `/staff`,
      icon: '/icons/icon-192.png',
    })

    const results = await Promise.allSettled(
      staffSubs.map((sub) =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
      )
    )

    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length) this.logger.warn(`${failed.length} push notifications failed`)
  }

  async notifyUser(userId: string, title: string, body: string, url?: string) {
    if (!process.env.VAPID_PUBLIC_KEY) return
    const subs = await this.repo.find({ where: { userId } })
    const payload = JSON.stringify({ title, body, url: url || '/', icon: '/icons/icon-192.png' })
    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
      )
    )
  }
}
