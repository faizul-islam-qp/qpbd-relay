import { Badge } from '@/components/ui/badge'

const PRIORITY_CONFIG: Record<string, { label: string; variant: any }> = {
  LOW:    { label: 'Low',    variant: 'secondary' },
  NORMAL: { label: 'Normal', variant: 'outline' },
  HIGH:   { label: 'High',   variant: 'warning' },
  URGENT: { label: 'Urgent', variant: 'destructive' },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] || { label: priority, variant: 'outline' }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
