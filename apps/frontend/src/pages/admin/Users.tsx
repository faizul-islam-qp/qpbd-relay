import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/common/UserAvatar'
import { UserPlus, UserX, UserCheck, Pencil, X, Trash2 } from 'lucide-react'

type Tab = 'all' | 'add-staff' | 'add-employee'

const EMPTY_FORM = { name: '', phone: '', email: '', password: '' }
const EMPTY_EDIT = { name: '', email: '', phone: '', role: '', password: '' }

export default function AdminUsers() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  // edit state
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [editError, setEditError] = useState('')

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => adminApi.listUsers() })

  const createStaff = useMutation({
    mutationFn: () => adminApi.createStaff({ name: form.name, phone: form.phone }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setTab('all'); setForm(EMPTY_FORM) },
    onError: (e: any) => setError(e.response?.data?.message || 'Failed'),
  })

  const createEmployee = useMutation({
    mutationFn: () => adminApi.createEmployee({ name: form.name, email: form.email, password: form.password }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setTab('all'); setForm(EMPTY_FORM) },
    onError: (e: any) => setError(e.response?.data?.message || 'Failed'),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => adminApi.deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const activate = useMutation({
    mutationFn: (id: string) => adminApi.activateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const updateUser = useMutation({
    mutationFn: (data: any) => adminApi.updateUser(editingUser.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); closeEdit() },
    onError: (e: any) => setEditError(e.response?.data?.message || 'Failed'),
  })

  const openEdit = (u: any) => {
    setEditingUser(u)
    setEditForm({ name: u.name, email: u.email || '', phone: u.phone || '', role: u.role, password: '' })
    setEditError('')
  }

  const closeEdit = () => { setEditingUser(null); setEditForm(EMPTY_EDIT); setEditError('') }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {}
    if (editForm.name !== editingUser.name) payload.name = editForm.name
    if (editForm.email !== (editingUser.email || '')) payload.email = editForm.email
    if (editForm.phone !== (editingUser.phone || '')) payload.phone = editForm.phone
    if (editForm.role !== editingUser.role) payload.role = editForm.role
    if (editForm.password) payload.password = editForm.password
    updateUser.mutate(payload)
  }

  const roleColor: Record<string, any> = { admin: 'default', employee: 'info', staff: 'success' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold md:text-2xl">Users</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => setTab('add-staff')}><UserPlus className="h-4 w-4 mr-1" />Add Staff</Button>
          <Button size="sm" variant="outline" onClick={() => setTab('add-employee')}><UserPlus className="h-4 w-4 mr-1" />Add Employee</Button>
        </div>
      </div>

      {tab !== 'all' && (
        <Card className="max-w-md mb-6">
          <CardHeader><CardTitle>Add {tab === 'add-staff' ? 'Staff' : 'Employee'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); setError(''); tab === 'add-staff' ? createStaff.mutate() : createEmployee.mutate() }} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required />
              </div>
              {tab === 'add-staff' ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="+8801XXXXXXXXX" required />
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
                    📲 Staff will link Telegram automatically on first login — no Chat ID needed.
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="name@questionpro.com" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required />
                  </div>
                </>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={createStaff.isPending || createEmployee.isPending}>Add User</Button>
                <Button type="button" variant="outline" onClick={() => setTab('all')}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit panel */}
      {editingUser && (
        <Card className="max-w-md mb-6 border-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Edit — {editingUser.name}</CardTitle>
            <Button size="icon" variant="ghost" onClick={closeEdit}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} required />
              </div>
              {(editingUser.role === 'employee' || editingUser.role === 'admin') && (
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({...p, email: e.target.value}))} />
                </div>
              )}
              {editingUser.role === 'staff' && (
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} placeholder="+8801XXXXXXXXX" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(p => ({...p, role: e.target.value}))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep)</span></Label>
                <Input type="password" value={editForm.password} onChange={e => setEditForm(p => ({...p, password: e.target.value}))} placeholder="••••••••" />
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={updateUser.isPending}>Save Changes</Button>
                <Button type="button" variant="outline" onClick={closeEdit}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {isLoading && [1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
        {(users as any[]).map((u) => (
          <Card key={u.id} className={!u.isActive ? 'opacity-60' : ''}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <UserAvatar name={u.name} email={u.email} size={32} />
                <div>
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email || u.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={roleColor[u.role]}>{u.role}</Badge>
                {!u.isActive && <Badge variant="destructive">Inactive</Badge>}
                <Button
                  size="icon" variant="ghost"
                  disabled={updateUser.isPending && editingUser?.id === u.id}
                  onClick={() => openEdit(u)}
                  title="Edit user"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                {u.isActive ? (
                  <Button
                    size="icon" variant="ghost"
                    disabled={deactivate.isPending && (deactivate.variables as string) === u.id}
                    onClick={() => deactivate.mutate(u.id)}
                    title="Deactivate"
                  >
                    <UserX className="h-4 w-4 text-muted-foreground" />
                  </Button>
                ) : (
                  <Button
                    size="icon" variant="ghost"
                    disabled={activate.isPending && (activate.variables as string) === u.id}
                    onClick={() => activate.mutate(u.id)}
                    title="Reactivate"
                  >
                    <UserCheck className="h-4 w-4 text-green-500" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  title="Delete permanently"
                  disabled={deleteUser.isPending && (deleteUser.variables as string) === u.id}
                  onClick={() => {
                    if (window.confirm(`Delete ${u.name} permanently? This cannot be undone.`)) {
                      deleteUser.mutate(u.id)
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
