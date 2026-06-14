import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const panelRef = useRef<HTMLDivElement>(null)

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  })

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1),
    enabled: open,
  })

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const count = countData?.count || 0
  const items = notifs?.data || []

  return (
    <div className="relative" ref={panelRef}>
      <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => setOpen((o) => !o)}>
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 bg-card border rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="font-semibold text-sm">Notifications</p>
              {count > 0 && (
                <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => markAll.mutate()}>
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y">
              {items.length === 0 && (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <p className="text-3xl mb-2">🔔</p>
                  <p>All caught up!</p>
                </div>
              )}
              {items.map((n: any) => (
                <div key={n.id} className={cn('px-4 py-3 text-sm', !n.isRead && 'bg-primary/5')}>
                  <p className="font-medium leading-tight">{n.title}</p>
                  {n.body && <p className="text-muted-foreground text-xs mt-0.5">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
