import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusType = string

interface StatusBadgeProps {
  status: StatusType | boolean | number | null | undefined
  label?: string
  className?: string
}

const DEFAULT_STATUS_MAP: Record<
  string,
  { variant: 'success' | 'secondary' | 'destructive' | 'warning' | 'default'; label: string }
> = {
  active: { variant: 'success', label: 'Active' },
  paused: { variant: 'secondary', label: 'Paused' },
  published: { variant: 'success', label: 'Published' },
  visible: { variant: 'success', label: 'Visible' },
  draft: { variant: 'secondary', label: 'Draft' },
  maintenance: { variant: 'secondary', label: 'Maintenance' },
  pending: { variant: 'secondary', label: 'Pending' },
  suspended: { variant: 'destructive', label: 'Suspended' },
  trash: { variant: 'destructive', label: 'Trash' },
  archived: { variant: 'warning', label: 'Archived' },
  error: { variant: 'destructive', label: 'Error' },
  failed: { variant: 'destructive', label: 'Failed' },
  hidden: { variant: 'warning', label: 'Hidden' },
  normal: { variant: 'secondary', label: 'Normal' },
  ai: { variant: 'warning', label: 'AI' },
  wordpress: { variant: 'success', label: 'WordPress' },
  facebook: { variant: 'success', label: 'Facebook' },
  google: { variant: 'warning', label: 'Google' },
  unknown: { variant: 'default', label: 'Unknown' },
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  if (status === null || status === undefined) {
    return <span className="text-muted-foreground/50">—</span>
  }

  // Handle boolean/number (e.g. is_hidden)
  const normalizedStatus = String(status).toLowerCase()
  if (status === true || status === 1 || status === '1' || status === 'true') {
    // This is ambiguous, but in the context of is_hidden, true means 'hidden'
    // We'll handle is_hidden mapping in the caller or here if we detect the prop name,
    // but let's just use the string value for now.
  }

  const config = DEFAULT_STATUS_MAP[normalizedStatus]

  if (!config) {
    return (
      <Badge variant="outline" className={cn('capitalize', className)}>
        {label || normalizedStatus}
      </Badge>
    )
  }

  return (
    <Badge variant={config.variant} className={cn('capitalize', className)}>
      {label || config.label}
    </Badge>
  )
}
