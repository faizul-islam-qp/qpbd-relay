import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Request, RequestStatus, RequestPriority } from './entities/request.entity'
import { RequestLog } from './entities/request-log.entity'
import { RequestComment } from './entities/request-comment.entity'
import { CreateRequestDto } from './dto/create-request.dto'
import { UpdateRequestDto } from './dto/update-request.dto'
import { EventsGateway } from '../events/events.gateway'
import { PushService } from '../push/push.service'
import { NotificationsService } from '../notifications/notifications.service'
import { User, UserRole } from '../users/entities/user.entity'

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request) private repo: Repository<Request>,
    @InjectRepository(RequestLog) private logRepo: Repository<RequestLog>,
    @InjectRepository(RequestComment) private commentRepo: Repository<RequestComment>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private eventsGateway: EventsGateway,
    private pushService: PushService,
    private notificationsService: NotificationsService,
  ) {}

  private async pickLeastLoadedStaff(): Promise<string | null> {
    const staff = await this.userRepo.find({ where: { role: UserRole.STAFF, isActive: true } })
    if (!staff.length) return null

    const activeStatuses = [RequestStatus.PENDING, RequestStatus.ASSIGNED, RequestStatus.IN_PROGRESS] as any[]
    const counts = await this.repo
      .createQueryBuilder('r')
      .select('r.assignedTo', 'staffId')
      .addSelect('COUNT(*)', 'count')
      .where('r.assignedTo IN (:...ids)', { ids: staff.map(s => s.id) })
      .andWhere('r.status IN (:...statuses)', { statuses: activeStatuses })
      .groupBy('r.assignedTo')
      .getRawMany()

    const countMap = new Map(counts.map((c: any) => [c.staffId, parseInt(c.count)]))
    const sorted = staff.sort((a, b) => (countMap.get(a.id) ?? 0) - (countMap.get(b.id) ?? 0))
    return sorted[0].id
  }

  async create(employeeId: string, dto: CreateRequestDto) {
    const staffId = await this.pickLeastLoadedStaff()

    const req = this.repo.create({
      employeeId,
      categoryId: dto.categoryId,
      title: dto.title,
      description: dto.description,
      priority: (dto.priority as RequestPriority) || RequestPriority.NORMAL,
      status: staffId ? RequestStatus.ASSIGNED : RequestStatus.PENDING,
      assignedTo: staffId ?? undefined,
    })
    const saved = await this.repo.save(req)
    const full = await this.findById(saved.id)

    await this.logRepo.save({
      requestId: saved.id,
      actorId: employeeId,
      newStatus: full.status,
      note: staffId ? 'Request created and auto-assigned' : 'Request created — no staff available',
    })

    this.eventsGateway.emitRequestCreated(full)
    await this.pushService.notifyAllStaff(full)

    // In-app notifications for staff so the bell count updates
    if (staffId) {
      await this.notificationsService.create(staffId, {
        requestId: saved.id,
        title: 'New request assigned to you',
        body: `"${full.title}" · ${full.category?.name || ''} · ${full.priority}`,
      })
    } else {
      const allStaff = await this.userRepo.find({ where: { role: UserRole.STAFF, isActive: true } })
      await Promise.all(allStaff.map(s =>
        this.notificationsService.create(s.id, {
          requestId: saved.id,
          title: 'New unassigned request',
          body: `"${full.title}" · ${full.category?.name || ''} — needs assignment`,
        })
      ))
    }

    return full
  }

  async findAll(user: { id: string; role: string }, filters: any = {}) {
    const qb = this.repo.createQueryBuilder('r')
      .leftJoinAndSelect('r.employee', 'employee')
      .leftJoinAndSelect('r.category', 'category')
      .leftJoinAndSelect('r.assignee', 'assignee')
      .orderBy('r.createdAt', 'DESC')

    if (user.role === UserRole.EMPLOYEE || (user.role === UserRole.ADMIN && filters.mine === 'true')) {
      qb.where('r.employeeId = :id', { id: user.id })
    }

    if (filters.status) qb.andWhere('r.status = :status', { status: filters.status })
    if (filters.categoryId) qb.andWhere('r.categoryId = :categoryId', { categoryId: filters.categoryId })
    if (filters.priority) qb.andWhere('r.priority = :priority', { priority: filters.priority })
    if (filters.assignedTo) qb.andWhere('r.assignedTo = :assignedTo', { assignedTo: filters.assignedTo })

    if (filters.page && filters.limit) {
      const page = parseInt(filters.page)
      const limit = parseInt(filters.limit)
      qb.skip((page - 1) * limit).take(limit)
    }

    return qb.getManyAndCount().then(([data, total]) => ({ data, total }))
  }

  async findById(id: string) {
    const req = await this.repo.findOne({
      where: { id },
      relations: ['employee', 'category', 'assignee', 'logs', 'logs.actor'],
    })
    if (!req) throw new NotFoundException('Request not found')
    return req
  }

  async updateStatus(id: string, actor: any, status: string, note?: string) {
    const req = await this.findById(id)
    const oldStatus = req.status

    if (actor.role === UserRole.EMPLOYEE) throw new ForbiddenException()

    req.status = status as RequestStatus
    await this.repo.save(req)

    await this.logRepo.save({ requestId: id, actorId: actor.id, oldStatus, newStatus: status, note })

    const updated = await this.findById(id)
    this.eventsGateway.emitRequestUpdated(updated)

    const statusLabel = status.toLowerCase().replace(/_/g, ' ')
    await this.notificationsService.create(req.employeeId, {
      requestId: id,
      title: `Request ${statusLabel}`,
      body: `Your request "${req.title}" is now ${statusLabel}`,
    })

    // Push to employee device
    await this.pushService.notifyUser(
      req.employeeId,
      `Request ${statusLabel}`,
      `"${req.title}" — ${statusLabel}`,
      `/employee/${id}`,
    )

    return updated
  }

  async cancelByEmployee(id: string, employeeId: string) {
    const req = await this.findById(id)
    if (req.employeeId !== employeeId) throw new ForbiddenException()
    if (!['PENDING', 'ASSIGNED'].includes(req.status)) {
      throw new BadRequestException('Can only cancel pending or assigned requests')
    }

    const oldStatus = req.status
    req.status = RequestStatus.CANCELLED
    await this.repo.save(req)
    await this.logRepo.save({ requestId: id, actorId: employeeId, oldStatus, newStatus: 'CANCELLED', note: 'Cancelled by requester' })

    const updated = await this.findById(id)
    this.eventsGateway.emitRequestUpdated(updated)
    return updated
  }

  async updateByEmployee(id: string, employeeId: string, dto: UpdateRequestDto) {
    const req = await this.findById(id)
    if (req.employeeId !== employeeId) throw new ForbiddenException()
    if (req.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Can only edit pending requests')
    }

    if (dto.title) req.title = dto.title
    if (dto.description !== undefined) req.description = dto.description
    if (dto.priority) req.priority = dto.priority as RequestPriority

    await this.repo.save(req)
    const updated = await this.findById(id)
    this.eventsGateway.emitRequestUpdated(updated)
    return updated
  }

  async assign(id: string, actor: any, staffId: string) {
    const req = await this.findById(id)
    req.assignedTo = staffId
    if (req.status === RequestStatus.PENDING) req.status = RequestStatus.ASSIGNED
    await this.repo.save(req)

    await this.logRepo.save({ requestId: id, actorId: actor.id, oldStatus: req.status, newStatus: 'ASSIGNED', note: `Assigned to staff` })

    const updated = await this.findById(id)
    this.eventsGateway.emitRequestUpdated(updated)

    // Notify newly assigned staff
    await this.notificationsService.create(staffId, {
      requestId: id,
      title: 'Request assigned to you',
      body: `"${req.title}" has been assigned to you`,
    })

    return updated
  }

  async getComments(requestId: string) {
    return this.commentRepo.find({
      where: { requestId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    })
  }

  async addComment(requestId: string, authorId: string, content: string) {
    const req = await this.repo.findOne({ where: { id: requestId } })
    if (!req) throw new NotFoundException('Request not found')

    const comment = this.commentRepo.create({ requestId, authorId, content })
    const saved = await this.commentRepo.save(comment)
    const full = await this.commentRepo.findOne({ where: { id: saved.id }, relations: ['author'] })

    // Notify other parties
    const notifyIds: string[] = []
    if (authorId !== req.employeeId) notifyIds.push(req.employeeId)
    if (req.assignedTo && authorId !== req.assignedTo) notifyIds.push(req.assignedTo)

    if (notifyIds.length) {
      const users = await this.userRepo.findByIds(notifyIds)
      const title = `New comment by ${full.author?.name ?? 'someone'}`
      const body = content.length > 80 ? content.slice(0, 80) + '…' : content

      for (const u of users) {
        await this.notificationsService.create(u.id, { requestId, title, body })
        const url = u.role === UserRole.STAFF ? `/staff/${requestId}`
          : u.role === UserRole.ADMIN ? `/admin/my-requests/${requestId}`
          : `/employee/${requestId}`
        await this.pushService.notifyUser(u.id, title, body, url)
      }
    }

    this.eventsGateway.emitCommentAdded(requestId, authorId, req.employeeId, req.assignedTo)

    return full
  }
}
