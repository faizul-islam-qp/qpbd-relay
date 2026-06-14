import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestsApi } from '@/api/requests'
import { categoriesApi } from '@/api/categories'
import { useAuthStore } from '@/store/auth'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Pencil, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { RequestComments } from '@/components/common/RequestComments'

const PRIORITIES = [
  { value: 'LOW', label: '🟢 Low' },
  { value: 'NORMAL', label: '🔵 Normal' },
  { value: 'HIGH', label: '🟡 High' },
  { value: 'URGENT', label: '🔴 Urgent' },
]

export default function EmployeeRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const myRequestsBase = user?.role === 'admin' ? '/admin/my-requests' : '/employee'
  const [editing, setEditing] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: '' })

  const { data: req, isLoading } = useQuery({
    queryKey: ['requests', id],
    queryFn: () => requestsApi.get(id!),
    refetchInterval: 10_000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    enabled: editing,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; description?: string; priority?: string }) =>
      requestsApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests', id] })
      setEditing(false)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => requestsApi.cancel(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      navigate(myRequestsBase)
    },
  })

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-xl" />
  if (!req) return <p className="text-muted-foreground">Request not found</p>

  const canEdit = req.status === 'PENDING'
  const canCancel = ['PENDING', 'ASSIGNED'].includes(req.status)

  function startEdit() {
    setEditForm({ title: req.title, description: req.description || '', priority: req.priority })
    setEditing(true)
  }

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-1">
        <Link to={myRequestsBase}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      <div className="grid gap-4 max-w-2xl">
        {/* Main info card */}
        {!editing ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{req.category?.icon}</span>
                  <div>
                    <CardTitle className="text-base">{req.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{req.category?.name}</p>
                  </div>
                </div>
                {(canEdit || canCancel) && (
                  <div className="flex gap-2 flex-shrink-0">
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={startEdit}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                    )}
                    {canCancel && !confirmCancel && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmCancel(true)}>
                        <XCircle className="h-3.5 w-3.5 mr-1" />Cancel
                      </Button>
                    )}
                    {confirmCancel && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                          Confirm cancel
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmCancel(false)}>Keep</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={req.status} />
                <PriorityBadge priority={req.priority} />
              </div>
              {req.description && <p className="text-sm">{req.description}</p>}
              {req.assignee && (
                <p className="text-sm text-muted-foreground">
                  Assigned to: <span className="font-medium text-foreground">{req.assignee.name}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">Created {format(new Date(req.createdAt), 'PPp')}</p>
            </CardContent>
          </Card>
        ) : (
          /* Edit form */
          <Card>
            <CardHeader><CardTitle className="text-base">Edit Request</CardTitle></CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(editForm) }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Details <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={editForm.priority} onValueChange={(v) => setEditForm((p) => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={updateMutation.isPending}>Save changes</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

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
