import { useEffect } from 'react'
import { getSocket } from '@/socket'
import { useAuthStore } from '@/store/auth'
import { useQueryClient } from '@tanstack/react-query'
import { useUnreadComments } from '@/store/unreadComments'

export function useSocket() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const markUnread = useUnreadComments((s) => s.markUnread)

  useEffect(() => {
    if (!user) return

    const socket = getSocket()

    const onNew = () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    const onUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    const onCommentNew = (data: { requestId: string; authorId: string }) => {
      if (data.authorId === user.id) return
      markUnread(data.requestId)
      queryClient.invalidateQueries({ queryKey: ['comments', data.requestId] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    socket.on('request:new', onNew)
    socket.on('request:updated', onUpdated)
    socket.on('comment:new', onCommentNew)

    return () => {
      socket.off('request:new', onNew)
      socket.off('request:updated', onUpdated)
      socket.off('comment:new', onCommentNew)
    }
  }, [user, queryClient, markUnread])

  return null
}
