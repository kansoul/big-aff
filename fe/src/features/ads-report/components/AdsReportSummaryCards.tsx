import type { ComponentType } from 'react'
import { Activity, BarChart3, Landmark, Pause, Radio, Wallet } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import type { AdsReportStatsData } from '@/features/ads-report/types'

type Props = {
  data: AdsReportStatsData | null
  loading: boolean
}

type StatItem = {
  label: string
  value: string
  hint: string
  icon: ComponentType<{ className?: string }>
  tone: string
}

function formatInteger(value: number): string {
  return value.toLocaleString()
}

function buildItems(data: AdsReportStatsData): StatItem[] {
  const items: StatItem[] = [
    {
      label: 'Campaign',
      value: formatInteger(data.campaigns.total),
      hint: 'Total campaigns',
      icon: BarChart3,
      tone: 'text-blue-500',
    },
    {
      label: 'Campaign Active',
      value: formatInteger(data.campaigns.active),
      hint: 'Active',
      icon: Activity,
      tone: 'text-emerald-500',
    },
    {
      label: 'Campaign Paused',
      value: formatInteger(data.campaigns.paused),
      hint: 'Paused',
      icon: Pause,
      tone: 'text-amber-500',
    },
    {
      label: 'Campaign Archived',
      value: formatInteger(data.campaigns.archived),
      hint: 'Archived',
      icon: Landmark,
      tone: 'text-rose-500',
    },
  ]

  data.spend_by_currency.forEach(({ currency, amount }) => {
    items.push({
      label: 'Total Spend',
      value: `${amount} ${currency}`,
      hint: 'Total spend from insights',
      icon: Wallet,
      tone: 'text-emerald-500',
    })
  })

  items.push({
    label: 'Total Reach',
    value: formatInteger(data.total_reach),
    hint: 'Total reach',
    icon: Radio,
    tone: 'text-slate-400',
  })

  return items
}

export function AdsReportSummaryCards({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
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
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <Card key={`${item.label}-${i}`} className="border-border/60 bg-card/80">
            <CardContent className="space-y-1.5 py-5">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className="text-4xl font-semibold tracking-tight text-foreground">{item.value}</p>
              <p className={`inline-flex items-center gap-1 text-sm font-medium ${item.tone}`}>
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
