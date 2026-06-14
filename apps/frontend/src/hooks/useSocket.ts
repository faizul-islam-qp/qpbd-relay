import { useEffect } from 'react'
import { getSocket } from '@/socket'
import { useAuthStore } from '@/store/auth'
import { useQueryClient } from '@tanstack/react-query'

export function useSocket() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

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

    socket.on('request:new', onNew)
    socket.on('request:updated', onUpdated)

    return () => {
      socket.off('request:new', onNew)
      socket.off('request:updated', onUpdated)
    }
  }, [user, queryClient])

  return null
}
