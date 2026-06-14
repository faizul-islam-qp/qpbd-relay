import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  const token = localStorage.getItem('token')
  // Recreate socket if token changed (e.g. new login)
  if (socket && socket.auth && (socket.auth as any).token !== token) {
    socket.disconnect()
    socket = null
  }
  if (!socket) {
    const url = import.meta.env.VITE_SOCKET_URL || '/'
    socket = io(url, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
