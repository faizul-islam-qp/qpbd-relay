import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { LayoutDashboard, PlusCircle, List, Users, Tag, LogOut, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/UserAvatar'
import { disconnectSocket } from '@/socket'

const NAV = {
  employee: [
    { to: '/employee', icon: LayoutDashboard, label: 'My Requests' },
    { to: '/employee/new', icon: PlusCircle, label: 'New Request' },
  ],
  staff: [
    { to: '/staff', icon: List, label: 'Request Queue' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/requests', icon: List, label: 'All Requests' },
    { to: '/admin/my-requests', icon: ClipboardList, label: 'My Requests' },
    { to: '/admin/my-requests/new', icon: PlusCircle, label: 'New Request' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/categories', icon: Tag, label: 'Categories' },
  ],
}

export function DesktopSidebar() {
  const { user, clearAuth } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const items = NAV[user?.role as keyof typeof NAV] || []

  return (
    <aside className="w-56 border-r bg-card flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="font-bold text-base mb-3">📡 QPBD Relay</h1>
        <div className="flex items-center gap-2.5">
          <UserAvatar name={user?.name || '?'} email={user?.email} size={32} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
              location.pathname === item.to || (item.to !== '/admin' && item.to !== '/employee' && location.pathname.startsWith(item.to)) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => { disconnectSocket(); clearAuth(); navigate('/login') }}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  )
}
