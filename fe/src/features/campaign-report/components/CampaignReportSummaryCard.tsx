import { memo } from 'react'

import { cn } from '@/lib/utils'
import type { CampaignReportSummary } from '@/features/campaign-report/types'

type MetricKey =
  | 'estimate_earning'
  | 'a_spend'
  | 'profit'
  | 'roi'
  | 'record_count'
  | 'a_conversion'
  | 'a_clicks'

type MetricDef = {
  key: MetricKey
  label: string
  format: 'currency' | 'percent' | 'number'
  tone?: 'profit' | 'neutral'
}

const METRICS: MetricDef[] = [
  { key: 'estimate_earning', label: 'Estimate Earning', format: 'currency' },
  { key: 'a_spend', label: 'Spend', format: 'currency' },
  { key: 'profit', label: 'Profit', format: 'currency', tone: 'profit' },
  { key: 'roi', label: 'ROI', format: 'percent', tone: 'profit' },
  { key: 'record_count', label: 'Records', format: 'number' },
  { key: 'a_conversion', label: 'Ads Conv.', format: 'number' },
  { key: 'a_clicks', label: 'Ads Clicks', format: 'number' },
]

function formatValue(value: number, kind: MetricDef['format']): string {
  if (kind === 'currency') {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (kind === 'percent') {
    return `${value.toFixed(2)}%`
  }
  return value.toLocaleString()
}

type Props = {
  summary: CampaignReportSummary | null
  title?: string
  loading?: boolean
}

function CampaignReportSummaryCardInner({
  summary,
  title = 'Grand Summary',
  loading = false,
}: Props) {
  const grid = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {METRICS.map((metric) => {
        const raw = summary
          ? Number((summary as unknown as Record<string, unknown>)[metric.key] ?? 0)
          : 0
        const value = Number.isFinite(raw) ? raw : 0
        const colorClass =
          metric.tone === 'profit'
            ? value >= 0
              ? 'text-emerald-500'
              : 'text-rose-500'
            : 'text-foreground'

        return (
          <div
            key={metric.key}
            className="flex flex-col gap-1 rounded-md border bg-background/40 px-3 py-2"
          >
            <span className="text-[11px] font-medium text-muted-foreground">{metric.label}</span>
            <span className={cn('text-sm font-semibold tabular-nums', colorClass)}>
              {loading && !summary ? '…' : formatValue(value, metric.format)}
            </span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/10 p-4 shadow-sm">
      <h3 className="text-sm font-bold text-muted-foreground">{title}</h3>
      {grid}
    </div>
  )
}

export const CampaignReportSummaryCard = memo(CampaignReportSummaryCardInner)
