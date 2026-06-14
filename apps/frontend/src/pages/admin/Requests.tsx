import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestsApi } from '@/api/requests'
import { adminApi } from '@/api/admin'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { UserAvatar } from '@/components/common/UserAvatar'

const STATUSES = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'REJECTED', 'CANCELLED']
const DONE_STATUSES = ['DONE', 'REJECTED', 'CANCELLED']

export default function AdminRequests() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [reassigning, setReassigning] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'admin', statusFilter],
    queryFn: () => requestsApi.list(statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 15_000,
  })

  const { data: staffList } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => adminApi.listUsers('staff'),
  })

  const assign = useMutation({
    mutationFn: ({ id, staffId }: { id: string; staffId: string }) => requestsApi.assign(id, staffId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests'] }); setReassigning(null) },
  })

  const requests = (data as any)?.data || []
  const staff = (staffList as any[]) || []

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold md:text-2xl">All Requests</h1>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'ALL' ? undefined : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>}

      <div className="space-y-2">
        {requests.map((req: any) => (
          <Card key={req.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{req.category?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{req.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.employee?.name} · {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StatusBadge status={req.status} />
                    <PriorityBadge priority={req.priority} />

                    {/* Assignee */}
                    {!DONE_STATUSES.includes(req.status) && (
                      reassigning === req.id ? (
                        <Select
                          value={req.assignedTo ?? undefined}
                          disabled={assign.isPending && (assign.variables as any)?.id === req.id}
                          onValueChange={(staffId) => assign.mutate({ id: req.id, staffId })}
                        >
                          <SelectTrigger className="h-6 text-xs w-32">
                            <SelectValue placeholder={assign.isPending && (assign.variables as any)?.id === req.id ? 'Saving…' : 'Pick staff'} />
                          </SelectTrigger>
                          <SelectContent>
                            {staff.map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : req.assignee ? (
                        <button
                          onClick={() => setReassigning(req.id)}
                          disabled={assign.isPending && (assign.variables as any)?.id === req.id}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          title="Click to reassign"
                        >
                          <UserAvatar name={req.assignee.name} size={16} />
                          {req.assignee.name}
                        </button>
                      ) : (
                        <button
                          onClick={() => setReassigning(req.id)}
                          disabled={assign.isPending && (assign.variables as any)?.id === req.id}
                          className="text-xs text-amber-500 hover:text-amber-400 transition-colors disabled:opacity-50"
                        >
                          No staff — assign manually
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && requests.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">No requests found</p>
          </div>
        )}
      </div>
    </div>
  )
}
