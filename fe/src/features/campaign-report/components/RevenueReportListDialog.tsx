import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { campaignReportApi } from '@/features/campaign-report/api'
import type {
  RevenueReportFilterParams,
  RevenueReportOrderBy,
  RevenueReportRow,
} from '@/features/campaign-report/types'
import { channelsApi } from '@/features/channels/api'
import type { ChannelOption } from '@/features/channels/types'

// ─── Column definitions ───────────────────────────────────────────────────────

type ColDef = {
  key: keyof RevenueReportRow
  label: string
  orderBy?: RevenueReportOrderBy
  className?: string
  render: (row: RevenueReportRow) => React.ReactNode
}

const COLUMNS: ColDef[] = [
  {
    key: 'date',
    label: 'Date',
    orderBy: 'date',
    className: 'min-w-[110px]',
    render: (row) => <span className="font-medium text-foreground">{row.date}</span>,
  },
  {
    key: 'style_name',
    label: 'Style',
    orderBy: 'style_code',
    className: 'min-w-[160px]',
    render: (row) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-foreground">{row.style_name}</span>
        <span className="font-mono text-[11px] text-muted-foreground/70">{row.style_code}</span>
      </div>
    ),
  },
  {
    key: 'channel_name',
    label: 'Channel',
    orderBy: 'channel_code',
    className: 'min-w-[160px]',
    render: (row) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground">{row.channel_name}</span>
        <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[11px]">
          {row.channel_code}
        </span>
      </div>
    ),
  },
  {
    key: 'page_views',
    label: 'Page Views',
    orderBy: 'page_views',
    className: 'text-right min-w-[100px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">
        {row.page_views.toLocaleString()}
      </span>
    ),
  },
  {
    key: 'clicks',
    label: 'Clicks',
    orderBy: 'clicks',
    className: 'text-right min-w-[80px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">{row.clicks.toLocaleString()}</span>
    ),
  },
  {
    key: 'estimated_earnings',
    label: 'Earnings',
    orderBy: 'estimated_earnings',
    className: 'text-right min-w-[100px]',
    render: (row) => <Badge variant="secondary">${row.estimated_earnings.toFixed(2)}</Badge>,
  },
  {
    key: 'cost_per_click',
    label: 'CPC',
    orderBy: 'cost_per_click',
    className: 'text-right min-w-[80px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">
        ${row.cost_per_click.toFixed(2)}
      </span>
    ),
  },
  {
    key: 'ad_requests',
    label: 'Ad Requests',
    orderBy: 'ad_requests',
    className: 'text-right min-w-[100px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">
        {row.ad_requests.toLocaleString()}
      </span>
    ),
  },
  {
    key: 'impressions',
    label: 'Impressions',
    orderBy: 'impressions',
    className: 'text-right min-w-[100px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">
        {row.impressions.toLocaleString()}
      </span>
    ),
  },
  {
    key: 'ad_requests_rpm',
    label: 'RPM (Req)',
    className: 'text-right min-w-[90px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">
        ${row.ad_requests_rpm.toFixed(2)}
      </span>
    ),
  },
  {
    key: 'impressions_rpm',
    label: 'RPM (Imp)',
    className: 'text-right min-w-[90px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">
        ${row.impressions_rpm.toFixed(2)}
      </span>
    ),
  },
  {
    key: 'funnel_requests',
    label: 'Funnel Req',
    orderBy: 'funnel_requests',
    className: 'text-right min-w-[90px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">
        {row.funnel_requests != null ? row.funnel_requests.toLocaleString() : '—'}
      </span>
    ),
  },
  {
    key: 'funnel_impressions',
    label: 'Funnel Imp',
    orderBy: 'funnel_impressions',
    className: 'text-right min-w-[90px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">
        {row.funnel_impressions != null ? row.funnel_impressions.toLocaleString() : '—'}
      </span>
    ),
  },
  {
    key: 'funnel_clicks',
    label: 'Funnel Clicks',
    orderBy: 'funnel_clicks',
    className: 'text-right min-w-[90px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">
        {row.funnel_clicks != null ? row.funnel_clicks.toLocaleString() : '—'}
      </span>
    ),
  },
  {
    key: 'funnel_rpm',
    label: 'Funnel RPM',
    orderBy: 'funnel_rpm',
    className: 'text-right min-w-[90px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">
        {row.funnel_rpm != null ? `$${row.funnel_rpm.toFixed(2)}` : '—'}
      </span>
    ),
  },
]

// ─── Sort header ──────────────────────────────────────────────────────────────

type SortHeaderProps = {
  col: ColDef
  filters: RevenueReportFilterParams
  onSort: (orderBy: RevenueReportOrderBy | null, order: 'asc' | 'desc' | null) => void
}

function SortHeader({ col, filters, onSort }: SortHeaderProps) {
  if (!col.orderBy) return <span>{col.label}</span>

  const isActive = filters.order_by === col.orderBy
  const currentOrder = isActive ? filters.order : null

  function handleClick() {
    if (!isActive || currentOrder === null) {
      onSort(col.orderBy!, 'desc')
    } else if (currentOrder === 'desc') {
      onSort(col.orderBy!, 'asc')
    } else {
      onSort(null, null)
    }
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      onClick={handleClick}
    >
      {col.label}
      {isActive && currentOrder === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : isActive && currentOrder === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const PER_PAGE_OPTIONS = [
  { label: '30', value: '30' },
  { label: '50', value: '50' },
  { label: '100', value: '100' },
]

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const delta = 2
  const left = current - delta
  const right = current + delta
  const pages: (number | '...')[] = [1]
  if (left > 2) pages.push('...')
  for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++) pages.push(i)
  if (right < total - 1) pages.push('...')
  pages.push(total)
  return pages
}

type PaginationBarProps = {
  filters: RevenueReportFilterParams
  rowCount: number
  onPaginationChange: (page: number, perPage: number) => void
}

function PaginationBar({ filters, rowCount, onPaginationChange }: PaginationBarProps) {
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 15
  const totalPages = Math.max(1, Math.ceil(rowCount / perPage))
  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div className="flex items-center gap-2 border-t border-border/70 bg-muted/25 px-4 justify-end py-2.5">
      <span className="text-xs text-muted-foreground">Per Page</span>
      <Select value={String(perPage)} onValueChange={(v) => onPaginationChange(1, Number(v))}>
        <SelectTrigger size="sm" className="w-16 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PER_PAGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1 ml-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page <= 1}
          onClick={() => onPaginationChange(1, perPage)}
        >
          <ChevronFirst className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page <= 1}
          onClick={() => onPaginationChange(page - 1, perPage)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {pageNumbers.map((p, i) =>
          p === '...' ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-7 w-7 items-center justify-center text-xs text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'secondary' : 'outline'}
              size="icon"
              className={cn('h-7 w-7 text-xs', p === page && 'font-semibold')}
              disabled={p === page}
              onClick={() => onPaginationChange(p, perPage)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page >= totalPages}
          onClick={() => onPaginationChange(page + 1, perPage)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page >= totalPages}
          onClick={() => onPaginationChange(totalPages, perPage)}
        >
          <ChevronLast className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: RevenueReportFilterParams = {
  page: 1,
  per_page: 30,
}

type RevenueReportListDialogProps = {
  trigger?: React.ReactNode
  initialDateFrom?: string | null
  initialDateTo?: string | null
  initialChannelCodes?: string[]
}

function RevenueReportListDialogInner({
  trigger,
  initialDateFrom,
  initialDateTo,
  initialChannelCodes,
}: RevenueReportListDialogProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<RevenueReportRow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState<RevenueReportFilterParams>({
    ...DEFAULT_FILTERS,
    date_from: initialDateFrom ?? null,
    date_to: initialDateTo ?? null,
    channel_codes: initialChannelCodes ?? [],
  })
  const [channelOptions, setChannelOptions] = useState<ChannelOption[]>([])
  const fetchedOptionsRef = useRef(false)

  const loadData = useCallback(async (activeFilters: RevenueReportFilterParams) => {
    try {
      setFetching(true)
      const { data: response } = await campaignReportApi.listRevenue(activeFilters)
      setData(response.data)
      setRowCount(response.pagination.total)
    } catch {
      toast.error('Failed to load revenue report')
      setData([])
      setRowCount(0)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void loadData(filters)
  }, [open, loadData, filters])

  useEffect(() => {
    if (!open || fetchedOptionsRef.current) return
    fetchedOptionsRef.current = true
    channelsApi
      .options()
      .then((res) => setChannelOptions(res.data))
      .catch(() => toast.error('Failed to load channel options'))
  }, [open])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (!next) {
        setFilters({
          ...DEFAULT_FILTERS,
          date_from: initialDateFrom ?? null,
          date_to: initialDateTo ?? null,
          channel_codes: initialChannelCodes ?? [],
        })
        setData([])
        setRowCount(0)
        fetchedOptionsRef.current = false
      }
    },
    [initialDateFrom, initialDateTo, initialChannelCodes],
  )

  const onFilterChange = useCallback((patch: Partial<RevenueReportFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))
  }, [])

  const onFilterReset = useCallback(
    () =>
      setFilters({
        ...DEFAULT_FILTERS,
        date_from: initialDateFrom ?? null,
        date_to: initialDateTo ?? null,
        channel_codes: initialChannelCodes ?? [],
      }),
    [initialDateFrom, initialDateTo, initialChannelCodes],
  )

  const onPaginationChange = useCallback((page: number, perPage: number) => {
    setFilters((prev) => ({ ...prev, page, per_page: perPage }))
  }, [])

  const onSort = useCallback(
    (orderBy: RevenueReportOrderBy | null, order: 'asc' | 'desc' | null) => {
      setFilters((prev) => ({
        ...prev,
        order_by: orderBy ?? undefined,
        order: order ?? undefined,
        page: 1,
      }))
    },
    [],
  )

  const onApplyFilters = useCallback(
    (values: Record<string, unknown>) => {
      const dateRange = values.date_range as { from: string | null; to: string | null } | null
      onFilterChange({
        date_from: dateRange?.from ?? null,
        date_to: dateRange?.to ?? null,
        channel_codes: Array.isArray(values.channel_codes)
          ? (values.channel_codes as string[])
          : [],
      })
    },
    [onFilterChange],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'date_range',
        label: 'Date',
        type: 'daterange',
        value:
          filters.date_from || filters.date_to
            ? { from: filters.date_from ?? null, to: filters.date_to ?? null }
            : null,
      },
      {
        field: 'channel_codes',
        label: 'Channels',
        type: 'multiselect',
        value: filters.channel_codes ?? [],
        options: channelOptions.map((c) => ({ label: c.name, value: c.code })),
      },
    ],
    [filters.date_from, filters.date_to, filters.channel_codes, channelOptions],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm">Revenue Report</Button>}</DialogTrigger>
      <DialogContent
        className="flex h-[95vh] w-[95vw] flex-col gap-0 p-0 sm:max-w-[95vw]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle>Revenue Report</DialogTitle>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <FilterPanel
            fields={filterFields}
            onReset={onFilterReset}
            applyMode
            onApply={onApplyFilters}
          />

          {/* Table card */}
          <div className="rounded-xl border border-border/70 bg-card shadow-sm">
            {/* Scrollable table */}
            <div className="relative overflow-auto">
              {fetching && data.length > 0 && (
                <div className="absolute inset-0 z-20 flex items-start justify-end bg-background/40 pr-4 pt-4 backdrop-blur-[1px]">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm ring-1 ring-border/60">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading…
                  </div>
                </div>
              )}
              <Table className="text-[13px]">
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="h-14 border-border/70 bg-muted/45 hover:bg-muted/45">
                    {COLUMNS.map((col) => (
                      <TableHead
                        key={col.key}
                        className={cn(
                          'h-14 whitespace-nowrap bg-transparent text-[12px] font-semibold tracking-[0.08em] text-muted-foreground uppercase',
                          col.className,
                        )}
                      >
                        <SortHeader col={col} filters={filters} onSort={onSort} />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {fetching && data.length === 0 && (
                    <TableRow className="h-20 border-border/70 hover:bg-transparent">
                      <TableCell
                        colSpan={COLUMNS.length}
                        className="h-20 whitespace-normal text-center"
                      >
                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading report...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!fetching && data.length === 0 && (
                    <TableRow className="h-20 border-border/70 hover:bg-transparent">
                      <TableCell
                        colSpan={COLUMNS.length}
                        className="h-20 whitespace-normal text-center"
                      >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <BarChart3 className="h-7 w-7 opacity-30" />
                          <p className="text-sm">No report rows found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {data.map((row) => (
                    <TableRow
                      key={row.id}
                      className="h-14 border-border/70 bg-background hover:bg-muted/20"
                    >
                      {COLUMNS.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination inside the card */}
            <PaginationBar
              filters={filters}
              rowCount={rowCount}
              onPaginationChange={onPaginationChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const RevenueReportListDialog = memo(RevenueReportListDialogInner)
