import { Skeleton } from '@/components/ui/skeleton'
import type { TeamOverviewData } from '@/features/team-report/types'

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val)
}

type Props = {
  data: TeamOverviewData | null
  loading: boolean
}

export function TeamOverviewCard({ data, loading }: Props) {
  const items = [
    {
      label: 'Revenue',
      value: data ? formatCurrency(data.revenue) : '$0.00',
      color: 'text-foreground',
      bg: 'bg-emerald-500/10',
      dot: 'bg-emerald-500',
    },
    {
      label: 'Spend',
      value: data ? formatCurrency(data.spend) : '$0.00',
      color: 'text-foreground',
      bg: 'bg-blue-500/10',
      dot: 'bg-blue-500',
    },
    {
      label: 'Profit',
      value: data ? formatCurrency(data.profit) : '$0.00',
      color: data && data.profit >= 0 ? 'text-emerald-500' : 'text-rose-500',
      bg: data && data.profit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      dot: data && data.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500',
    },
    {
      label: 'ROI',
      value: data ? `${data.roi.toFixed(2)}%` : '0.00%',
      color: data && data.roi >= 0 ? 'text-emerald-500' : 'text-rose-500',
      bg: data && data.roi >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      dot: data && data.roi >= 0 ? 'bg-emerald-500' : 'bg-rose-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border/50 bg-card px-5 py-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-block h-2 w-2 rounded-full ${item.dot}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-7 w-32" />
          ) : (
            <p className={`text-2xl font-bold tracking-tight ${item.color}`}>{item.value}</p>
          )}
        </div>
      ))}
    </div>
  )
}
