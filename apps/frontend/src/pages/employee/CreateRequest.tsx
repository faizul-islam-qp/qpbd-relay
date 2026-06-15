import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestsApi } from '@/api/requests'
import { categoriesApi } from '@/api/categories'
import { templatesApi } from '@/api/templates'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bookmark, BookmarkCheck, X, Zap } from 'lucide-react'
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

  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: templatesApi.list })

  const applyTemplate = (t: any) => {
    if (t.categoryId) setCategoryId(t.categoryId)
    setTitle(t.title)
    setDescription(t.description || '')
    setPriority(t.priority || 'NORMAL')
  }

  const submitMutation = useMutation({
    mutationFn: () => requestsApi.create({ categoryId, title, description, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      navigate(myRequestsBase)
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to create'),
  })

  const saveMutation = useMutation({
    mutationFn: () => templatesApi.create({ name: templateName, title, description, categoryId, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      setSavingTemplate(false)
      setTemplateName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  return (
    <div>
      <h1 className="text-xl font-bold mb-5 md:text-2xl">New Request</h1>

      {/* Quick templates */}
      {(templates as any[]).length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Quick templates
          </p>
          <div className="flex flex-wrap gap-2">
            {(templates as any[]).map((t) => (
              <div key={t.id} className="flex items-center rounded-full border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                >
                  {t.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(t.id)}
                  className="px-1.5 py-1 hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                  title="Delete template"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="max-w-xl">
        <CardHeader className="pb-4"><CardTitle className="text-base">What do you need?</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate() }} className="space-y-5">
            <div>
              <Label className="mb-3 block text-sm">Category</Label>
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

            {/* Save as template — shows only when title is filled */}
            {title && (
              <div className="border-t pt-4">
                {savingTemplate ? (
                  <div className="flex gap-2">
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name…"
                      className="h-8 text-sm flex-1"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!templateName || saveMutation.isPending}
                      onClick={() => saveMutation.mutate()}
                    >
                      <BookmarkCheck className="h-3.5 w-3.5 mr-1" />
                      {saveMutation.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setSavingTemplate(false); setTemplateName('') }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSavingTemplate(true)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    Save as template
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" className="flex-1 sm:flex-none" disabled={!categoryId || !title || submitMutation.isPending}>
                {submitMutation.isPending ? 'Submitting…' : 'Submit Request'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(myRequestsBase)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
