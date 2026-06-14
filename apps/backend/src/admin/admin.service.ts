import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Request } from '../requests/entities/request.entity'

@Injectable()
export class AdminService {
  constructor(@InjectRepository(Request) private reqRepo: Repository<Request>) {}

  async getStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [pending, inProgress, doneToday, total] = await Promise.all([
      this.reqRepo.count({ where: { status: 'PENDING' as any } }),
      this.reqRepo.count({ where: { status: 'IN_PROGRESS' as any } }),
      this.reqRepo
        .createQueryBuilder('r')
        .where('r.status = :s', { s: 'DONE' })
        .andWhere('r.updatedAt >= :today', { today })
        .getCount(),
      this.reqRepo.count(),
    ])

    const avgResult = await this.reqRepo
      .createQueryBuilder('r')
      .select('AVG(EXTRACT(EPOCH FROM (r.updatedAt - r.createdAt)))', 'avg')
      .where('r.status = :s', { s: 'DONE' })
      .getRawOne()

    const avgSeconds = Math.round(parseFloat(avgResult?.avg || 0))
    const avgFormatted = avgSeconds
      ? `${Math.floor(avgSeconds / 3600)}h ${Math.floor((avgSeconds % 3600) / 60)}m`
      : 'N/A'

    return { pending, inProgress, doneToday, total, avgResolutionTime: avgFormatted }
  }
}
