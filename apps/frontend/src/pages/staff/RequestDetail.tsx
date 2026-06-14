import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestsApi } from '@/api/requests'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { RequestComments } from '@/components/common/RequestComments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, CheckCircle, XCircle, Play, UserCheck, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'

const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: any; variant: any }[]> = {
  PENDING:     [{ next: 'ASSIGNED',    label: 'Accept',    icon: UserCheck,    variant: 'default' }],
  ASSIGNED:    [{ next: 'IN_PROGRESS', label: 'Start',     icon: Play,         variant: 'default' }],
  IN_PROGRESS: [
    { next: 'DONE',     label: 'Complete', icon: CheckCircle, variant: 'default' },
    { next: 'REJECTED', label: 'Reject',   icon: XCircle,     variant: 'destructive' },
  ],
  REJECTED: [
    { next: 'PENDING',     label: 'Re-queue',  icon: RotateCcw,  variant: 'outline' },
    { next: 'ASSIGNED',    label: 'Accept',    icon: UserCheck,  variant: 'default' },
    { next: 'IN_PROGRESS', label: 'Start Now', icon: Play,       variant: 'default' },
  ],
  CANCELLED: [
    { next: 'PENDING',     label: 'Re-queue',  icon: RotateCcw,  variant: 'outline' },
    { next: 'IN_PROGRESS', label: 'Start Now', icon: Play,       variant: 'default' },
  ],
}

export default function StaffRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [rejectNote, setRejectNote] = useState('')

  const { data: req, isLoading } = useQuery({
    queryKey: ['requests', id],
    queryFn: () => requestsApi.get(id!),
    refetchInterval: 15_000,
  })

  const mutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      requestsApi.updateStatus(id!, status, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests', id] }),
  })

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-xl" />
  if (!req) return <p className="text-muted-foreground">Request not found</p>

  const actions = STATUS_ACTIONS[req.status] || []
  const isUrgent = req.priority === 'URGENT'

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-1">
        <Link to="/staff"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
      </Button>

      <div className="grid gap-4 max-w-2xl">
        {/* Main info */}
        <Card className={isUrgent ? 'border-red-300 dark:border-red-800' : ''}>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">{req.category?.icon}</span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base leading-snug">{req.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{req.category?.name}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={req.status} />
              <PriorityBadge priority={req.priority} />
            </div>
            {req.description && <p className="text-sm">{req.description}</p>}
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>From: <span className="text-foreground font-medium">{req.employee?.name}</span></p>
              {req.assignee && <p>Assigned: <span className="text-foreground font-medium">{req.assignee.name}</span></p>}
              <p className="text-xs">{format(new Date(req.createdAt), 'PPp')}</p>
            </div>

            {/* Actions */}
            {actions.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                {req.status === 'IN_PROGRESS' && (
                  <Input
                    placeholder="Note for rejection (optional)"
                    className="h-8 text-xs"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                  />
                )}
                <div className="flex gap-2 flex-wrap">
                  {actions.map((action) => {
                    const pending = mutation.isPending && (mutation.variables as any)?.status === action.next
                    return (
                      <Button
                        key={action.next}
                        size="sm"
                        variant={action.variant}
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ status: action.next, note: rejectNote || undefined })}
                      >
                        <action.icon className="h-3.5 w-3.5 mr-1" />
                        {pending ? '…' : action.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        {req.logs?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {req.logs.map((log: any) => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium capitalize">{log.newStatus.replace(/_/g, ' ').toLowerCase()}</p>
                      {log.note && <p className="text-muted-foreground text-xs">{log.note}</p>}
                      <p className="text-xs text-muted-foreground">
                        {log.actor?.name} · {format(new Date(log.createdAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        <Card>
          <CardContent className="pt-5">
            <RequestComments requestId={id!} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
