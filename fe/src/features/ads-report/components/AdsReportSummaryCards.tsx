import type { ComponentType } from 'react'
import { Activity, Banknote, BarChart3, Eye, Landmark, Pause, Wallet } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import type { AdsReportSummary } from '@/features/ads-report/types'

type AdsReportSummaryCardsProps = {
  summary: AdsReportSummary
}

type Item = {
  label: string
  value: string
  hint: string
  icon: ComponentType<{ className?: string }>
  tone: string
}

function formatUsd(value: number): string {
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
}

function formatInteger(value: number): string {
  return value.toLocaleString()
}

export function AdsReportSummaryCards({ summary }: AdsReportSummaryCardsProps) {
  const items: Item[] = [
    {
      label: 'Campaign',
      value: formatInteger(summary.campaign_total),
      hint: 'Total campaigns',
      icon: BarChart3,
      tone: 'text-blue-500',
    },
    {
      label: 'Campaign Active',
      value: formatInteger(summary.campaign_active),
      hint: 'Running',
      icon: Activity,
      tone: 'text-emerald-500',
    },
    {
      label: 'Campaign Paused',
      value: formatInteger(summary.campaign_paused),
      hint: 'Paused',
      icon: Pause,
      tone: 'text-amber-500',
    },
    {
      label: 'Campaign Archived',
      value: formatInteger(summary.campaign_archived),
      hint: 'Archived',
      icon: Landmark,
      tone: 'text-rose-500',
    },
    {
      label: 'Total Spend',
      value: formatUsd(summary.total_spend),
      hint: 'Spend from insights',
      icon: Wallet,
      tone: 'text-emerald-500',
    },
    {
      label: 'Revenue',
      value: formatUsd(summary.total_revenue),
      hint: 'Total revenue',
      icon: Banknote,
      tone: 'text-emerald-500',
    },
    {
      label: 'Profit',
      value: formatUsd(summary.total_profit),
      hint: 'Revenue - Spend',
      icon: BarChart3,
      tone: summary.total_profit >= 0 ? 'text-emerald-500' : 'text-rose-500',
    },
    {
      label: 'Total Impressions',
      value: formatInteger(summary.total_impressions),
      hint: 'Total impressions',
      icon: Eye,
      tone: 'text-blue-500',
    },
    {
      label: 'Total Reach',
      value: formatInteger(summary.total_reach),
      hint: 'Total reach',
      icon: Activity,
      tone: 'text-slate-200',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label} className="border-border/60 bg-card/80">
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
