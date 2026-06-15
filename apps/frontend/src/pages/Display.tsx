import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { formatDistanceToNow } from 'date-fns'
import { io } from 'socket.io-client'

const COLS = [
  { key: 'PENDING',     label: '⏳ Pending',     bg: 'bg-amber-950/60',  header: 'bg-amber-500',  ring: 'ring-amber-500/40' },
  { key: 'ASSIGNED',   label: '👤 Assigned',    bg: 'bg-blue-950/60',   header: 'bg-blue-500',   ring: 'ring-blue-500/40' },
  { key: 'IN_PROGRESS',label: '⚡ In Progress', bg: 'bg-emerald-950/60',header: 'bg-emerald-500',ring: 'ring-emerald-500/40' },
]

const PRIORITY_CHIP: Record<string, string> = {
  URGENT: 'bg-red-500 text-white',
  HIGH:   'bg-orange-500 text-white',
  NORMAL: 'bg-zinc-600 text-zinc-200',
  LOW:    'bg-zinc-700 text-zinc-400',
}

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className="font-mono">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
}

export default function Display() {
  const [requests, setRequests] = useState<any[]>([])

  const fetchRequests = async () => {
    try {
      const data = await api.get('/display/active').then(r => r.data)
      setRequests(data)
    } catch {}
  }

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(fetchRequests, 15_000)
    const socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] })
    socket.on('request:new', fetchRequests)
    socket.on('request:updated', fetchRequests)
    return () => { clearInterval(interval); socket.disconnect() }
  }, [])

  const byStatus = (s: string) => requests.filter(r => r.status === s)

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col overflow-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-10 py-5 bg-zinc-900 border-b-2 border-zinc-700 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-5xl">📡</span>
          <div>
            <div className="text-3xl font-black tracking-tight">QPBD Relay</div>
            <div className="text-zinc-400 text-lg">Live Request Board</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-5xl font-black tabular-nums text-white"><Clock /></div>
          <div className="text-zinc-400 text-lg mt-1">{requests.length} active requests</div>
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 grid grid-cols-3 gap-6 p-6">
        {COLS.map(col => {
          const items = byStatus(col.key)
          return (
            <div key={col.key} className="flex flex-col gap-4 min-h-0">

              {/* Column header */}
              <div className={`${col.header} rounded-2xl px-6 py-3 flex items-center justify-between shadow-lg`}>
                <span className="text-2xl font-black text-white">{col.label}</span>
                <span className="text-5xl font-black text-white/90">{items.length}</span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 overflow-y-auto flex-1">
                {items.map(req => (
                  <div
                    key={req.id}
                    className={`${col.bg} rounded-2xl ring-2 ${col.ring} p-5 space-y-3 ${req.priority === 'URGENT' ? 'ring-red-500 ring-4 shadow-red-900/50 shadow-lg' : ''}`}
                  >
                    {/* Title row */}
                    <div className="flex items-start gap-4">
                      <span className="text-5xl leading-none flex-shrink-0">{req.category?.icon || '📋'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-bold leading-tight line-clamp-2 text-white">{req.title}</p>
                        <p className="text-zinc-400 text-base mt-1">{req.category?.name}</p>
                      </div>
                      <span className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-bold ${PRIORITY_CHIP[req.priority] || PRIORITY_CHIP.NORMAL}`}>
                        {req.priority}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="border-t border-white/10 pt-3 flex items-center justify-between text-base">
                      <div className="space-y-0.5">
                        <div className="text-zinc-300 font-medium">From: <span className="text-white">{req.employee?.name}</span></div>
                        {req.assignee && (
                          <div className="text-zinc-400">Staff: <span className="text-zinc-200">{req.assignee.name}</span></div>
                        )}
                      </div>
                      <div className="text-zinc-500 text-sm text-right">
                        {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
