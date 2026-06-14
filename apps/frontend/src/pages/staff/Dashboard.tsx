import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { requestsApi } from '@/api/requests'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Clock, CheckCircle, XCircle, Play, UserCheck, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '@/store/auth'
import { RequestComments } from '@/components/common/RequestComments'
import { useUnreadComments } from '@/store/unreadComments'

const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: any; variant: any }[]> = {
  PENDING:     [{ next: 'ASSIGNED',    label: 'Accept',   icon: UserCheck,    variant: 'default' }],
  ASSIGNED:    [{ next: 'IN_PROGRESS', label: 'Start',    icon: Play,         variant: 'default' }],
  IN_PROGRESS: [
    { next: 'DONE',     label: 'Complete', icon: CheckCircle, variant: 'default' },
    { next: 'REJECTED', label: 'Reject',   icon: XCircle,     variant: 'destructive' },
  ],
}

type Filter = 'active' | 'mine' | 'done'

export default function StaffDashboard() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({})
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const unreadComments = useUnreadComments((s) => s.unread)
  const [filter, setFilter] = useState<Filter>('active')

  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'staff', filter],
    queryFn: () => {
      if (filter === 'mine') return requestsApi.list({ assignedTo: user!.id })
      if (filter === 'done') return requestsApi.list({ status: 'DONE' })
      return requestsApi.list()
    },
    refetchInterval: 15_000,
  })

  const mutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      requestsApi.updateStatus(id, status, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  })

  const requests = (data?.data || []).filter((r: any) =>
    filter === 'active' ? !['DONE', 'REJECTED'].includes(r.status) : true
  )

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'mine', label: 'Mine' },
    { key: 'done', label: 'Done' },
  ]

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold md:text-2xl">Request Queue</h1>
        <p className="text-sm text-muted-foreground">{requests.length} requests</p>
      </div>

      {/* Filter tabs — scrollable on mobile */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? 'default' : 'outline'}
            className="flex-shrink-0"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      )}

      {!isLoading && requests.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-medium">All clear!</p>
        </div>
      )}

      <div className="space-y-3">
        {requests.map((req: any) => {
          const actions = STATUS_ACTIONS[req.status] || []
          const isUrgent = req.priority === 'URGENT'
          return (
            <Card key={req.id} className={isUrgent ? 'border-red-300 dark:border-red-800' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{req.category?.icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{req.title}</p>
                      <p className="text-xs text-muted-foreground">{req.employee?.name} · {req.category?.name}</p>
                      {req.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{req.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge status={req.status} />
                    <PriorityBadge priority={req.priority} />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  </div>
                  <button
                    onClick={() => setOpenComments((p) => ({ ...p, [req.id]: !p[req.id] }))}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Comments
                    {unreadComments[req.id] && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                  </button>
                </div>

                {actions.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {req.status === 'IN_PROGRESS' && (
                      <Input
                        placeholder="Note for rejection (optional)"
                        className="h-8 text-xs"
                        value={rejectNote[req.id] || ''}
                        onChange={(e) => setRejectNote((p) => ({ ...p, [req.id]: e.target.value }))}
                      />
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {actions.map((action) => {
                        const pending = mutation.isPending && (mutation.variables as any)?.id === req.id && (mutation.variables as any)?.status === action.next
                        return (
                          <Button
                            key={action.next}
                            size="sm"
                            variant={action.variant}
                            disabled={mutation.isPending && (mutation.variables as any)?.id === req.id}
                            onClick={() => mutation.mutate({ id: req.id, status: action.next, note: rejectNote[req.id] })}
                          >
                            <action.icon className="h-3.5 w-3.5 mr-1" />
                            {pending ? '…' : action.label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {openComments[req.id] && (
                  <div className="mt-3 pt-3 border-t">
                    <RequestComments requestId={req.id} compact />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
