import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { Injectable } from '@nestjs/common'

@Injectable()
@WebSocketGateway({ cors: { origin: '*' }, transports: ['websocket', 'polling'] })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1]
    if (!token) { client.disconnect(); return }
    try {
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'fallback-secret' })
      client.data.user = payload
      client.join(`role:${payload.role}`)
      client.join(`user:${payload.sub}`)
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(_client: Socket) {}

  emitRequestCreated(request: any) {
    this.server.to('role:staff').emit('request:new', request)
    this.server.to('role:admin').emit('request:new', request)
    // Notify the requester so their list refreshes immediately
    this.server.to(`user:${request.employeeId}`).emit('request:new', request)
  }

  emitRequestUpdated(request: any) {
    this.server.to(`user:${request.employeeId}`).emit('request:updated', request)
    this.server.to('role:staff').emit('request:updated', request)
    this.server.to('role:admin').emit('request:updated', request)
  }

  emitCommentAdded(requestId: string, authorId: string, employeeId: string, assignedTo: string | null) {
    const payload = { requestId, authorId }
    this.server.to(`user:${employeeId}`).emit('comment:new', payload)
    if (assignedTo) this.server.to(`user:${assignedTo}`).emit('comment:new', payload)
    this.server.to('role:admin').emit('comment:new', payload)
  }
}
