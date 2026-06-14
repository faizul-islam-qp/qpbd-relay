import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '@/api/categories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICON_OPTIONS = [
  { icon: '☕', label: 'Coffee/Tea' },
  { icon: '🍕', label: 'Food' },
  { icon: '💻', label: 'IT/Computer' },
  { icon: '🖨️', label: 'Printer' },
  { icon: '📶', label: 'Network/WiFi' },
  { icon: '🔧', label: 'Maintenance' },
  { icon: '💡', label: 'Electrical' },
  { icon: '🌡️', label: 'AC/Climate' },
  { icon: '🚿', label: 'Cleaning' },
  { icon: '🧹', label: 'Housekeeping' },
  { icon: '🪑', label: 'Furniture' },
  { icon: '📦', label: 'Supplies' },
  { icon: '🚗', label: 'Transport' },
  { icon: '🔒', label: 'Security' },
  { icon: '🏥', label: 'Medical' },
  { icon: '📋', label: 'Admin/HR' },
  { icon: '📞', label: 'Phone' },
  { icon: '📪', label: 'Mail' },
  { icon: '🛒', label: 'Procurement' },
  { icon: '🗃️', label: 'Storage' },
  { icon: '🚪', label: 'Access' },
  { icon: '🌿', label: 'Plants' },
  { icon: '🎯', label: 'Other' },
  { icon: '⚡', label: 'Power' },
]

export default function AdminCategories() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const create = useMutation({
    mutationFn: () => categoriesApi.create({ name, icon }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setAdding(false); setName(''); setIcon('') },
  })

  const remove = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold md:text-2xl">Categories</h1>
        <Button size="sm" onClick={() => setAdding(true)}><PlusCircle className="h-4 w-4 mr-1" />Add</Button>
      </div>

      {adding && (
        <Card className="max-w-sm mb-4">
          <CardContent className="p-4">
            <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {ICON_OPTIONS.map((opt) => (
                    <button
                      key={opt.icon}
                      type="button"
                      title={opt.label}
                      onClick={() => setIcon(opt.icon)}
                      className={cn(
                        'flex items-center justify-center h-10 rounded-lg border-2 text-xl transition-all active:scale-90',
                        icon === opt.icon
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border hover:border-primary/40'
                      )}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
                {icon && (
                  <p className="text-xs text-muted-foreground">
                    Selected: <span className="text-base">{icon}</span> — {ICON_OPTIONS.find(o => o.icon === icon)?.label}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tea / Coffee" required />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={create.isPending || !icon}>
                  {create.isPending ? 'Adding…' : 'Add'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setAdding(false); setIcon(''); setName('') }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(cats as any[]).map((cat) => (
          <Card key={cat.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                disabled={remove.isPending && (remove.variables as string) === cat.id}
                onClick={() => remove.mutate(cat.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
