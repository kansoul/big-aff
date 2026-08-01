import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ─── Hook: resolve CSS vars to real colors for SVG/recharts ──────────────────

function resolveCssColors() {
  const div = document.createElement('div')
  div.style.display = 'none'
  document.body.appendChild(div)
  div.style.color = 'var(--muted-foreground)'
  const mutedFg = getComputedStyle(div).color
  div.style.color = 'var(--border)'
  const border = getComputedStyle(div).color
  document.body.removeChild(div)
  return { mutedFg: mutedFg || '#94a3b8', border: border || '#334155' }
}

function useChartColors() {
  const [colors, setColors] = useState(() => resolveCssColors())
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(resolveCssColors()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return colors
}
import { BarChart2, Loader2, TrendingDown, TrendingUp, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { campaignReportApi } from '@/features/campaign-report/api'
import { axiosInstance } from '@/shared/api/axios'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type RevenueChartMetric =
  | 'estimated_earnings'
  | 'clicks'
  | 'page_views'
  | 'impressions'
  | 'ad_requests'
  | 'cost_per_click'
  | 'ad_requests_rpm'
  | 'impressions_rpm'
  | 'funnel_requests'
  | 'funnel_impressions'
  | 'funnel_clicks'
  | 'funnel_rpm'

type ChartStats = {
  total: number
  avg: number
  max: number
  min: number
  count: number
}

type ChartApiData = {
  labels: string[]
  values: number[]
  stats: ChartStats
}

type DateRange = { from: string | null; to: string | null }
type ChannelOption = { code: string; name: string | null }

type ChartFilters = {
  channel_codes: string[]
  date_range: DateRange | null
  metric: RevenueChartMetric | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METRIC_OPTIONS: { label: string; value: string }[] = [
  { label: 'Earnings', value: 'estimated_earnings' },
  { label: 'Clicks', value: 'clicks' },
  { label: 'Page Views', value: 'page_views' },
  { label: 'Impressions', value: 'impressions' },
  { label: 'Ad Requests', value: 'ad_requests' },
  { label: 'RPC', value: 'cost_per_click' },
  { label: 'Ad Req RPM', value: 'ad_requests_rpm' },
  { label: 'Impr RPM', value: 'impressions_rpm' },
  { label: 'Funnel Req', value: 'funnel_requests' },
  { label: 'Funnel Impr', value: 'funnel_impressions' },
  { label: 'Funnel Clicks', value: 'funnel_clicks' },
  { label: 'Funnel RPM', value: 'funnel_rpm' },
]

const DEFAULT_METRIC: RevenueChartMetric = 'cost_per_click'

const CHART_COLOR = '#3b82f6'
const CHART_COLOR_MUTED = '#93c5fd'

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchRevenueChart(filters: ChartFilters): Promise<ChartApiData> {
  const params: Record<string, unknown> = {}
  if (filters.channel_codes.length) params['channel_codes[]'] = filters.channel_codes
  if (filters.date_range?.from) params.date_from = filters.date_range.from
  if (filters.date_range?.to) params.date_to = filters.date_range.to
  if (filters.metric) params.metric = filters.metric
  const res = await axiosInstance.get<{ data: ChartApiData }>('/revenue-chart-reports/chart', {
    params,
  })
  return res.data.data
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function fmtFull(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

type TooltipPayloadItem = { value: number; dataKey: string }

type CustomTooltipProps = {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  return (
    <div className="min-w-[140px] overflow-hidden rounded-lg border border-border/80 bg-popover shadow-xl">
      <div className="border-b border-border/60 bg-muted/50 px-3 py-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CHART_COLOR }} />
        <span className="text-xs font-semibold text-foreground">{fmtFull(value)}</span>
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string
  value: string
  sub?: string
  highlight?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
}

function StatCard({ label, value, sub, highlight = 'neutral', icon }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-md',
              highlight === 'positive' && 'bg-emerald-500/10 text-emerald-500',
              highlight === 'negative' && 'bg-rose-500/10 text-rose-500',
              highlight === 'neutral' && 'bg-muted text-muted-foreground',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <span
        className={cn(
          'text-xl font-bold tabular-nums leading-none',
          highlight === 'positive' && 'text-emerald-500',
          highlight === 'negative' && 'text-rose-500',
          highlight === 'neutral' && 'text-foreground',
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

// ─── Chart Panel ──────────────────────────────────────────────────────────────

type ChartPoint = { label: string; value: number }

type RevenueAreaChartProps = {
  data: ChartPoint[]
  stats: ChartStats
  metricLabel: string
}

function RevenueAreaChart({ data, stats, metricLabel }: RevenueAreaChartProps) {
  const avgValue = stats.avg
  const { mutedFg, border } = useChartColors()

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total"
          value={fmtCompact(stats.total)}
          sub={fmtFull(stats.total)}
          highlight="neutral"
        />
        <StatCard
          label="Average"
          value={fmtCompact(stats.avg)}
          sub={`per data point`}
          highlight="neutral"
        />
        <StatCard
          label="Peak"
          value={fmtCompact(stats.max)}
          highlight="positive"
          icon={<TrendingUp className="h-3 w-3" />}
        />
        <StatCard
          label="Low"
          value={fmtCompact(stats.min)}
          highlight="negative"
          icon={<TrendingDown className="h-3 w-3" />}
        />
        <StatCard label="Data Points" value={stats.count.toLocaleString()} highlight="neutral" />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">
        {/* Chart header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLOR }} />
            <span className="text-sm font-semibold text-foreground">{metricLabel}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-px w-6 border-t border-dashed border-muted-foreground/60" />
              Avg
            </span>
          </div>
        </div>

        {/* Recharts area */}
        <div className="h-120 p-4 pt-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rcGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.35} />
                  <stop offset="70%" stopColor={CHART_COLOR} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={border}
                strokeOpacity={0.4}
                vertical={false}
              />
              <ReferenceLine
                y={avgValue}
                stroke={CHART_COLOR_MUTED}
                strokeDasharray="5 4"
                strokeWidth={1.5}
                strokeOpacity={0.7}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: mutedFg }}
                axisLine={{ stroke: border }}
                tickLine={false}
                interval="preserveStartEnd"
                dy={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: mutedFg }}
                axisLine={false}
                tickLine={false}
                width={60}
                tickFormatter={fmtCompact}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: CHART_COLOR,
                  strokeWidth: 1,
                  strokeOpacity: 0.3,
                  strokeDasharray: '4 3',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_COLOR}
                strokeWidth={2}
                fill="url(#rcGradient)"
                dot={false}
                activeDot={{ r: 5, fill: CHART_COLOR, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export type RevenueChartDialogProps = {
  trigger?: React.ReactNode
  initialChannelCodes?: string[]
  initialDateFrom?: string | null
  initialDateTo?: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function RevenueChartDialog({
  trigger,
  initialChannelCodes,
  initialDateFrom,
  initialDateTo,
  open: controlledOpen,
  onOpenChange,
}: RevenueChartDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = typeof controlledOpen === 'boolean'
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const [channelOptions, setChannelOptions] = useState<ChannelOption[]>([])
  const [filters, setFilters] = useState<ChartFilters>(() => ({
    channel_codes: initialChannelCodes ?? [],
    date_range:
      initialDateFrom || initialDateTo
        ? { from: initialDateFrom ?? null, to: initialDateTo ?? null }
        : null,
    metric: DEFAULT_METRIC,
  }))
  const [chartData, setChartData] = useState<ChartApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchedChannelsRef = useRef(false)

  useEffect(() => {
    if (!open) return
    if (fetchedChannelsRef.current) return
    fetchedChannelsRef.current = true
    campaignReportApi
      .filters()
      .then((res) => setChannelOptions(res.data.data.channels))
      .catch(() => toast.error('Failed to fetch channel options'))
  }, [open])

  const makeInitialFilters = useCallback(
    (): ChartFilters => ({
      channel_codes: initialChannelCodes ?? [],
      date_range:
        initialDateFrom || initialDateTo
          ? { from: initialDateFrom ?? null, to: initialDateTo ?? null }
          : null,
      metric: DEFAULT_METRIC,
    }),
    [initialChannelCodes, initialDateFrom, initialDateTo],
  )

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
      if (!next) {
        setFilters(makeInitialFilters())
        setChartData(null)
      }
    },
    [isControlled, makeInitialFilters, onOpenChange],
  )

  useEffect(() => {
    if (!open) return
    if (!filters.metric) return

    let ignore = false
    fetchRevenueChart(filters)
      .then((data) => {
        if (!ignore) setChartData(data)
      })
      .catch(() => {
        if (!ignore) toast.error('Failed to fetch chart data')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [open, filters])

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setFilters(makeInitialFilters())
    setChartData(null)
  }, [makeInitialFilters])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'channel_codes',
        label: 'Channels',
        type: 'multiselect',
        value: filters.channel_codes,
        options: channelOptions.map((c) => ({ label: c.name ?? c.code, value: c.code })),
      },
      {
        field: 'date_range',
        label: 'Date Range',
        type: 'daterange',
        value: filters.date_range ?? null,
      },
      {
        field: 'metric',
        label: 'Metric',
        type: 'select',
        value: filters.metric,
        options: METRIC_OPTIONS,
        placeholder: 'Select metric...',
        hideAllOption: true,
      },
    ],
    [filters, channelOptions],
  )

  const chartPoints = useMemo<ChartPoint[]>(
    () =>
      chartData
        ? chartData.labels.map((label, i) => ({ label, value: chartData.values[i] ?? 0 }))
        : [],
    [chartData],
  )

  const metricLabel = METRIC_OPTIONS.find((o) => o.value === filters.metric)?.label ?? 'Value'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button size="sm">Revenue Chart</Button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        className="flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 p-0 sm:h-[95vh] sm:w-[95vw] sm:max-w-[95vw]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <BarChart2 className="h-3.5 w-3.5 text-primary" />
              </div>
              <DialogTitle>Revenue Chart</DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <FilterPanel
            fields={filterFields}
            onReset={handleReset}
            onFieldChange={handleFieldChange}
            defaultOpen
          />

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-5 py-20 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Loading chart data…</p>
            </div>
          )}

          {!loading && chartData && (
            <RevenueAreaChart
              data={chartPoints}
              stats={chartData.stats}
              metricLabel={metricLabel}
            />
          )}

          {!loading && !chartData && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <BarChart2 className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No chart data yet</p>
                <p className="text-xs text-muted-foreground">
                  Select your filters above to load the chart data automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
