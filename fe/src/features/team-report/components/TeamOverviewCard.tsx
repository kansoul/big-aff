import { Banknote, BarChart3, Monitor, TrendingDown, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import type { TeamOverviewData } from '@/features/team-report/types'

type Props = {
  data: TeamOverviewData | null
  loading: boolean
}

type StatItem = {
  label: string
  hint: string
  value: string
  icon: ComponentType<{ className?: string }>
  tone: string
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatRoi(value: number): string {
  return `${value.toFixed(2)}%`
}

function buildItems(d: TeamOverviewData): StatItem[] {
  return [
    {
      label: 'Revenue',
      hint: 'Total revenue',
      value: formatUsd(d.revenue),
      icon: Banknote,
      tone: 'text-emerald-500',
    },
    {
      label: 'Spend',
      hint: 'Total spend',
      value: formatUsd(d.spend),
      icon: Monitor,
      tone: 'text-blue-500',
    },
    {
      label: 'Profit',
      hint: 'Revenue - Spend',
      value: formatUsd(d.profit),
      icon: d.profit >= 0 ? BarChart3 : TrendingDown,
      tone: d.profit >= 0 ? 'text-emerald-500' : 'text-rose-500',
    },
    {
      label: 'ROI',
      hint: 'Profit / Spend',
      value: formatRoi(d.roi),
      icon: d.roi >= 0 ? TrendingUp : TrendingDown,
      tone: d.roi >= 0 ? 'text-emerald-500' : 'text-rose-500',
    },
  ]
}

export function TeamOverviewCard({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/60 bg-card/80">
            <CardContent className="space-y-3 py-5">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) return null

  const items = buildItems(data)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label} className="border-border/60 bg-card/80">
            <CardContent className="space-y-1.5 py-5">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{item.value}</p>
              <p className={`inline-flex items-center gap-1 text-xs font-medium ${item.tone}`}>
                {item.hint}
                <Icon className="h-3.5 w-3.5" />
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
