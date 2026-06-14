import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Moon, Sun, BellOff } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { DesktopSidebar } from './DesktopSidebar'
import { MobileNav } from './MobileNav'
import { NotificationBell } from '@/components/common/NotificationBell'
import { Button } from '@/components/ui/button'
import { usePush } from '@/hooks/usePush'
import { useSocket } from '@/hooks/useSocket'

export function AppLayout() {
  const { user } = useAuthStore()
  const { dark, toggle, init } = useThemeStore()
  const { permission, requestPermission, supported } = usePush()
  useSocket()

  useEffect(() => { init() }, [init])

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <DesktopSidebar />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="flex items-center justify-between px-4 h-14 border-b bg-card flex-shrink-0">
          {/* App name — mobile only, desktop shows in sidebar */}
          <span className="font-bold text-sm md:hidden">📡 QPBD Relay</span>
          <span className="hidden md:block" />

          <div className="flex items-center gap-1">
            {supported && permission === 'default' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-amber-500 hover:text-amber-600"
                onClick={requestPermission}
                title="Enable browser notifications"
              >
                <BellOff className="h-4 w-4" />
              </Button>
            )}
            <NotificationBell />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle} aria-label="Toggle dark mode">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="container max-w-4xl mx-auto p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
