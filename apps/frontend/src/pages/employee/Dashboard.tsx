import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { requestsApi } from '@/api/requests'
import { useAuthStore } from '@/store/auth'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlusCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function EmployeeDashboard() {
  const { user } = useAuthStore()
  const myRequestsBase = user?.role === 'admin' ? '/admin/my-requests' : '/employee'
  const listParams = user?.role === 'admin' ? { mine: 'true' } : undefined
  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'mine', user?.role],
    queryFn: () => requestsApi.list(listParams),
    refetchInterval: 15_000,
  })

  const requests = data?.data || []

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">My Requests</h1>
          <p className="text-muted-foreground text-sm">{requests.length} total</p>
        </div>
        <Button asChild size="sm">
          <Link to={`${myRequestsBase}/new`}><PlusCircle className="h-4 w-4 mr-1.5" />New</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      )}

      {!isLoading && requests.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-medium">No requests yet</p>
          <p className="text-sm mt-1">Tap New to create your first request</p>
          <Button asChild className="mt-4">
            <Link to={`${myRequestsBase}/new`}>Create Request</Link>
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {requests.map((req: any) => (
          <Link key={req.id} to={`${myRequestsBase}/${req.id}`}>
            <Card className="hover:shadow-md transition-shadow active:scale-[0.99] cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{req.category?.icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{req.title}</p>
                      <p className="text-xs text-muted-foreground">{req.category?.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge status={req.status} />
                    <PriorityBadge priority={req.priority} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  {req.assignee && <span className="ml-2">· {req.assignee.name}</span>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
