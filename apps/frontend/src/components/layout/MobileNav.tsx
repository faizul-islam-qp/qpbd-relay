import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { LayoutDashboard, PlusCircle, List, Users, Tag, LogOut, ClipboardList } from 'lucide-react'
import { disconnectSocket } from '@/socket'

const NAV = {
  employee: [
    { to: '/employee', icon: LayoutDashboard, label: 'Requests' },
    { to: '/employee/new', icon: PlusCircle, label: 'New' },
  ],
  staff: [
    { to: '/staff', icon: List, label: 'Queue' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/requests', icon: List, label: 'All' },
    { to: '/admin/my-requests', icon: ClipboardList, label: 'Mine' },
    { to: '/admin/my-requests/new', icon: PlusCircle, label: 'New' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/categories', icon: Tag, label: 'Categories' },
  ],
}

export function MobileNav() {
  const { user, clearAuth } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const items = NAV[user?.role as keyof typeof NAV] || []

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex items-center safe-area-pb">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors',
            location.pathname === item.to || (item.to !== '/admin' && item.to !== '/employee' && location.pathname.startsWith(item.to)) ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <item.icon className={cn('h-5 w-5', location.pathname === item.to && 'text-primary')} />
          {item.label}
        </Link>
      ))}
      <button
        onClick={() => { disconnectSocket(); clearAuth(); navigate('/login') }}
        className="flex-shrink-0 flex flex-col items-center gap-1 py-3 px-3 text-xs text-muted-foreground"
      >
        <LogOut className="h-5 w-5" />
        Out
      </button>
    </nav>
  )
}
