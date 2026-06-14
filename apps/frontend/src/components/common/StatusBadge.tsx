import { Badge } from '@/components/ui/badge'

const STATUS_CONFIG: Record<string, { label: string; variant: any }> = {
  PENDING:     { label: 'Pending',     variant: 'warning' },
  ASSIGNED:    { label: 'Assigned',    variant: 'info' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  DONE:        { label: 'Done',        variant: 'success' },
  REJECTED:    { label: 'Rejected',    variant: 'destructive' },
  CANCELLED:   { label: 'Cancelled',   variant: 'secondary' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, variant: 'secondary' }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
