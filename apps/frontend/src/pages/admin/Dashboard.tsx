import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '@/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle2, AlertCircle, Activity, ChevronRight } from 'lucide-react'

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
    refetchInterval: 30_000,
  })

  const cards = [
    { label: 'Pending',      value: stats?.pending ?? '—',          icon: AlertCircle,  color: 'text-yellow-500' },
    { label: 'In Progress',  value: stats?.inProgress ?? '—',       icon: Activity,     color: 'text-blue-500' },
    { label: 'Done Today',   value: stats?.doneToday ?? '—',        icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Avg Time',     value: stats?.avgResolutionTime ?? '—', icon: Clock,        color: 'text-purple-500' },
  ]

  const links = [
    { to: '/admin/requests',   emoji: '📋', label: 'All Requests' },
    { to: '/admin/users',      emoji: '👥', label: 'Manage Users' },
    { to: '/admin/categories', emoji: '🏷️', label: 'Categories' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold mb-5 md:text-2xl">Dashboard</h1>

      {/* Stats — 2 cols on mobile, 4 on md+ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-2xl font-bold ${isLoading ? 'animate-pulse text-muted' : ''}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {links.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors ${i < links.length - 1 ? 'border-b' : ''}`}
            >
              <span className="text-xl">{l.emoji}</span>
              <span className="text-sm font-medium flex-1">{l.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
