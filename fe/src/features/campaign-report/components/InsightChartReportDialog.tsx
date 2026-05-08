import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from '@/lib/dayjs'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

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
import { TableBody, TableCell, TableRow } from '@/components/ui/table'
import { cn, getPageNumbers } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type RevenueChartRow = {
  id: number
  channel_code: string
  channel_name: string
  datetime: string | null

  // Delta (real_) via LAG
  real_earnings: number
  real_clicks: number
  real_page_views: number
  real_ad_requests: number
  real_impressions: number
  real_funnel_requests: number
  real_funnel_impressions: number
  real_funnel_clicks: number

  // Derived
  rpc: number
  ad_requests_rpm: number
  impressions_rpm: number
  funnel_rpm: number
}

type Pagination = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type DateRange = { from: string | null; to: string | null }

type IntervalOption = '5m' | '15m' | '30m' | '1' | '2' | '3' | '4' | '6' | '12' | '24'

type Filters = {
  date_range: DateRange | null
  hourly_interval: IntervalOption
  per_page: number
  page: number
  order_by: string
  order: 'asc' | 'desc'
}

type SortState = { column: string; direction: 'asc' | 'desc' } | null

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERVAL_OPTIONS = [
  { label: '5 Minutes', value: '5m' },
  { label: '15 Minutes', value: '15m' },
  { label: '30 Minutes', value: '30m' },
  { label: '1 Hour', value: '1' },
  { label: '2 Hours', value: '2' },
  { label: '3 Hours', value: '3' },
  { label: '4 Hours', value: '4' },
  { label: '6 Hours', value: '6' },
  { label: '12 Hours', value: '12' },
  { label: 'Daily', value: '24' },
]

const PER_PAGE_OPTIONS = [10, 25, 50, 100, 200]

const COLUMNS: { key: string; label: string; numeric?: boolean }[] = [
  { key: 'datetime', label: 'Date/Time' },
  { key: 'rpc', label: '🟡 RPC ($)', numeric: true },
  { key: 'real_earnings', label: '🟡 Revenue ($)', numeric: true },
  { key: 'real_clicks', label: '🟡 Conv.', numeric: true },
  { key: 'real_page_views', label: '🟡 SearchView', numeric: true },
  { key: 'real_ad_requests', label: '🟡 Ad Requests', numeric: true },
  { key: 'real_impressions', label: '🟡 Search Impr.', numeric: true },
  { key: 'ad_requests_rpm', label: '🟡 Search RPM', numeric: true },
  { key: 'impressions_rpm', label: '🟡 Impr. RPM', numeric: true },
  { key: 'real_funnel_requests', label: '🟡 KW Request', numeric: true },
  { key: 'real_funnel_impressions', label: '🟡 KW Impr.', numeric: true },
  { key: 'real_funnel_clicks', label: '🟡 KW Clicks', numeric: true },
  { key: 'funnel_rpm', label: '🟡 KW RPM', numeric: true },
]

const SORTABLE_COLUMNS = new Set(['datetime'])

// ─── Totals ───────────────────────────────────────────────────────────────────

type Totals = Omit<RevenueChartRow, 'id' | 'channel_code' | 'channel_name' | 'datetime'>

function computeTotals(rows: RevenueChartRow[]): Totals {
  const t = {
    real_earnings: 0,
    real_clicks: 0,
    real_page_views: 0,
    real_ad_requests: 0,
    real_impressions: 0,
    real_funnel_requests: 0,
    real_funnel_impressions: 0,
    real_funnel_clicks: 0,
    rpc: 0,
    ad_requests_rpm: 0,
    impressions_rpm: 0,
    funnel_rpm: 0,
  }
  for (const r of rows) {
    t.real_earnings += r.real_earnings
    t.real_clicks += r.real_clicks
    t.real_page_views += r.real_page_views
    t.real_ad_requests += r.real_ad_requests
    t.real_impressions += r.real_impressions
    t.real_funnel_requests += r.real_funnel_requests
    t.real_funnel_impressions += r.real_funnel_impressions
    t.real_funnel_clicks += r.real_funnel_clicks
  }
  t.rpc = t.real_clicks > 0 ? t.real_earnings / t.real_clicks : 0
  t.ad_requests_rpm = t.real_ad_requests > 0 ? (t.real_earnings / t.real_ad_requests) * 1000 : 0
  t.impressions_rpm = t.real_impressions > 0 ? (t.real_earnings / t.real_impressions) * 1000 : 0
  t.funnel_rpm = t.real_funnel_requests > 0 ? (t.real_earnings / t.real_funnel_requests) * 1000 : 0
  return t
}

const SUMMARY_COLUMNS = new Set([
  'rpc',
  'real_earnings',
  'real_clicks',
  'real_page_views',
  'real_ad_requests',
  'real_funnel_requests',
  'real_funnel_clicks',
])

function formatTotalCell(key: string, t: Totals): string {
  if (!SUMMARY_COLUMNS.has(key)) return ''
  switch (key) {
    case 'rpc':
      return fmtUsd(t.rpc)
    case 'real_earnings':
      return fmtUsd(t.real_earnings)
    case 'real_clicks':
      return fmtInt(t.real_clicks)
    case 'real_page_views':
      return fmtInt(t.real_page_views)
    case 'real_ad_requests':
      return fmtInt(t.real_ad_requests)
    case 'real_funnel_requests':
      return fmtInt(t.real_funnel_requests)
    case 'real_funnel_clicks':
      return fmtInt(t.real_funnel_clicks)
    default:
      return ''
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUsd(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
}

function fmtInt(n: number): string {
  return n.toLocaleString()
}

function fmtDatetime(s: string | null): string {
  if (!s) return '—'
  return dayjs(s.replace(/([+-]\d{2}:\d{2}|Z)$/, '')).format('DD/MM/YYYY HH:mm')
}

function formatCell(key: string, row: RevenueChartRow): string {
  switch (key) {
    case 'datetime':
      return fmtDatetime(row.datetime)
    case 'rpc':
      return fmtUsd(row.rpc)
    case 'real_earnings':
      return fmtUsd(row.real_earnings)
    case 'real_clicks':
      return fmtInt(row.real_clicks)
    case 'real_page_views':
      return fmtInt(row.real_page_views)
    case 'real_ad_requests':
      return fmtInt(row.real_ad_requests)
    case 'real_impressions':
      return fmtInt(row.real_impressions)
    case 'ad_requests_rpm':
      return fmtUsd(row.ad_requests_rpm)
    case 'impressions_rpm':
      return fmtUsd(row.impressions_rpm)
    case 'real_funnel_requests':
      return fmtInt(row.real_funnel_requests)
    case 'real_funnel_impressions':
      return fmtInt(row.real_funnel_impressions)
    case 'real_funnel_clicks':
      return fmtInt(row.real_funnel_clicks)
    case 'funnel_rpm':
      return fmtUsd(row.funnel_rpm)
    default:
      return '—'
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchRevenueChartReports(
  channelCode: string,
  filters: Filters,
): Promise<{ rows: RevenueChartRow[]; pagination: Pagination }> {
  const params: Record<string, unknown> = {
    page: filters.page,
    per_page: filters.per_page,
    order_by: filters.order_by,
    order: filters.order,
    hourly_interval: filters.hourly_interval,
    channel_code: channelCode,
  }
  if (filters.date_range?.from) params.date_from = filters.date_range.from
  if (filters.date_range?.to) params.date_to = filters.date_range.to

  const res = await axiosInstance.get<{ data: RevenueChartRow[]; pagination: Pagination }>(
    '/revenue-chart-reports',
    { params },
  )
  return { rows: res.data.data, pagination: res.data.pagination }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({ column, sort }: { column: string; sort: SortState }) {
  if (!SORTABLE_COLUMNS.has(column)) return null
  if (!sort || sort.column !== column)
    return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />
  if (sort.direction === 'asc') return <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />
  return <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />
}

function TotalRow({ totals, label, sticky }: { totals: Totals; label: string; sticky?: boolean }) {
  return (
    <TableRow
      className={cn(
        'bg-muted/30 font-semibold hover:bg-muted/30',
        sticky && 'sticky bottom-0 z-10',
      )}
    >
      {COLUMNS.map((col, i) => (
        <TableCell
          key={col.key}
          className={cn('py-1.5 text-[11px]', col.numeric && 'text-right tabular-nums')}
        >
          {i === 0 ? (
            <span className="font-bold text-primary">{label}</span>
          ) : (
            formatTotalCell(col.key, totals)
          )}
        </TableCell>
      ))}
    </TableRow>
  )
}

function GroupHeader({ channelCode, channelName }: { channelCode: string; channelName: string }) {
  const label = channelName ? `${channelName} (${channelCode})` : channelCode
  return (
    <TableRow className="bg-muted/40 hover:bg-muted/40">
      <TableCell
        colSpan={COLUMNS.length}
        className="py-1.5 pl-3 text-[11px] font-semibold text-foreground"
      >
        {label || '—'}
      </TableCell>
    </TableRow>
  )
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export type InsightChartReportDialogProps = {
  trigger?: React.ReactNode
  channelCode: string
  channelName?: string
  initialDateFrom?: string | null
  initialDateTo?: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function InsightChartReportDialog({
  trigger,
  channelCode,
  channelName,
  initialDateFrom,
  initialDateTo,
  open: controlledOpen,
  onOpenChange,
}: InsightChartReportDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = typeof controlledOpen === 'boolean'
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const makeInitialFilters = useCallback(
    (): Filters => ({
      date_range:
        initialDateFrom || initialDateTo
          ? { from: initialDateFrom ?? null, to: initialDateTo ?? null }
          : null,
      hourly_interval: '1',
      per_page: 25,
      page: 1,
      order_by: 'datetime',
      order: 'desc',
    }),
    [initialDateFrom, initialDateTo],
  )

  const [filters, setFilters] = useState<Filters>(makeInitialFilters)
  const [rows, setRows] = useState<RevenueChartRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)

  const sort: SortState = useMemo(
    () => ({ column: filters.order_by, direction: filters.order }),
    [filters.order_by, filters.order],
  )

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
      if (!next) {
        setFilters(makeInitialFilters())
        setRows([])
        setPagination(null)
        setLoading(true)
      }
    },
    [isControlled, makeInitialFilters, onOpenChange],
  )

  useEffect(() => {
    if (!open || !channelCode) return

    let ignore = false

    fetchRevenueChartReports(channelCode, filters)
      .then(({ rows: r, pagination: p }) => {
        if (!ignore) {
          setRows(r)
          setPagination(p)
        }
      })
      .catch(() => {
        if (!ignore) toast.error('Failed to fetch revenue chart data')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [open, channelCode, filters])

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [field]: value, page: 1 }))
  }, [])

  const handleReset = useCallback(() => {
    setFilters(makeInitialFilters())
  }, [makeInitialFilters])

  const handleSort = useCallback((column: string) => {
    if (!SORTABLE_COLUMNS.has(column)) return
    setFilters((prev) => ({
      ...prev,
      order_by: column,
      order: prev.order_by === column && prev.order === 'desc' ? 'asc' : 'desc',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handlePerPageChange = useCallback((perPage: number) => {
    setFilters((prev) => ({ ...prev, per_page: perPage, page: 1 }))
  }, [])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'date_range',
        label: 'Date Range',
        type: 'daterange',
        value: filters.date_range ?? null,
      },
      {
        field: 'hourly_interval',
        label: 'Interval',
        type: 'select',
        value: filters.hourly_interval,
        options: INTERVAL_OPTIONS,
        hideAllOption: true,
        placeholder: 'Select interval...',
      },
    ],
    [filters.date_range, filters.hourly_interval],
  )

  // Group rows by channel_code
  const groupedRows = useMemo(() => {
    const groups = new Map<
      string,
      { channelCode: string; channelName: string; rows: RevenueChartRow[] }
    >()
    for (const row of rows) {
      const key = row.channel_code || ''
      if (!groups.has(key)) {
        groups.set(key, {
          channelCode: row.channel_code,
          channelName: row.channel_name,
          rows: [],
        })
      }
      groups.get(key)!.rows.push(row)
    }
    return [...groups.values()]
  }, [rows])

  const grandTotals = useMemo(() => computeTotals(rows), [rows])

  const pageNumbers = useMemo(
    () => (pagination ? getPageNumbers(pagination.current_page, pagination.last_page) : []),
    [pagination],
  )

  const title = channelName
    ? `Revenue Chart: ${channelName} (${channelCode})`
    : `Revenue Chart: ${channelCode}`

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
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
              </div>
              <DialogTitle className="truncate text-sm">{title}</DialogTitle>
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

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <FilterPanel
            fields={filterFields}
            onReset={handleReset}
            onFieldChange={handleFieldChange}
            defaultOpen
          />

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-5 py-16 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Loading data…</p>
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <BarChart3 className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No data</p>
                <p className="text-xs text-muted-foreground">
                  No records found for this channel and date range.
                </p>
              </div>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-border bg-card">
                <table className="w-full caption-bottom text-sm">
                  <thead className="sticky top-0 z-10 [&_tr]:border-b">
                    <tr className="border-b border-border">
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className={cn(
                            'h-10 px-4 align-middle font-medium whitespace-nowrap bg-muted text-[11px] text-foreground',
                            col.numeric && 'text-right',
                            SORTABLE_COLUMNS.has(col.key) &&
                              'cursor-pointer select-none hover:text-foreground',
                          )}
                          onClick={() => handleSort(col.key)}
                        >
                          {col.label}
                          <SortIcon column={col.key} sort={sort} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <TableBody>
                    {groupedRows.map((group) => (
                      <>
                        <GroupHeader
                          key={`header-${group.channelCode}`}
                          channelCode={group.channelCode}
                          channelName={group.channelName}
                        />
                        {group.rows.map((row) => (
                          <TableRow key={row.id} className="text-[11px]">
                            {COLUMNS.map((col) => (
                              <TableCell
                                key={col.key}
                                className={cn('py-1.5', col.numeric && 'text-right tabular-nums')}
                              >
                                {formatCell(col.key, row)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {group.rows.length > 1 && (
                          <TotalRow
                            key={`subtotal-${group.channelCode}`}
                            totals={computeTotals(group.rows)}
                            label="Subtotal"
                          />
                        )}
                      </>
                    ))}
                    {rows.length > 1 && <TotalRow totals={grandTotals} label="Total" sticky />}
                  </TableBody>
                </table>
              </div>

              {pagination && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {pagination.total.toLocaleString()} record
                      {pagination.total !== 1 ? 's' : ''}
                    </span>
                    <span>·</span>
                    <span>Per page:</span>
                    {PER_PAGE_OPTIONS.map((n) => (
                      <button
                        key={n}
                        onClick={() => handlePerPageChange(n)}
                        className={cn(
                          'rounded px-1.5 py-0.5 text-xs font-medium transition-colors',
                          filters.per_page === n
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.current_page === 1}
                      className="rounded p-1 hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronFirst className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={pagination.current_page === 1}
                      className="rounded p-1 hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    {pageNumbers.map((n, i) =>
                      n === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
                          …
                        </span>
                      ) : (
                        <button
                          key={n}
                          onClick={() => handlePageChange(n)}
                          className={cn(
                            'min-w-[24px] rounded px-1.5 py-0.5 text-xs font-medium transition-colors',
                            pagination.current_page === n
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted',
                          )}
                        >
                          {n}
                        </button>
                      ),
                    )}

                    <button
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={pagination.current_page === pagination.last_page}
                      className="rounded p-1 hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.last_page)}
                      disabled={pagination.current_page === pagination.last_page}
                      className="rounded p-1 hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronLast className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
