import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestsApi } from '@/api/requests'
import { categoriesApi } from '@/api/categories'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const PRIORITIES = [
  { value: 'LOW', label: '🟢 Low' },
  { value: 'NORMAL', label: '🔵 Normal' },
  { value: 'HIGH', label: '🟡 High' },
  { value: 'URGENT', label: '🔴 Urgent' },
]

export default function CreateRequest() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const myRequestsBase = user?.role === 'admin' ? '/admin/my-requests' : '/employee'
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [error, setError] = useState('')

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const mutation = useMutation({
    mutationFn: () => requestsApi.create({ categoryId, title, description, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      navigate(myRequestsBase)
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to create'),
  })

  return (
    <div>
      <h1 className="text-xl font-bold mb-5 md:text-2xl">New Request</h1>
      <Card className="max-w-xl">
        <CardHeader className="pb-4"><CardTitle className="text-base">What do you need?</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-5">
            <div>
              <Label className="mb-3 block text-sm">Category</Label>
              {/* Responsive grid: 4 cols on sm+, 3 cols on xs */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(categories as any[]).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-sm active:scale-95',
                      categoryId === cat.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs text-center leading-tight line-clamp-2">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief description" required />
            </div>

            <div className="space-y-1.5">
              <Label>Details <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any additional info…" rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" className="flex-1 sm:flex-none" disabled={!categoryId || !title || mutation.isPending}>
                {mutation.isPending ? 'Submitting…' : 'Submit Request'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(myRequestsBase)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
