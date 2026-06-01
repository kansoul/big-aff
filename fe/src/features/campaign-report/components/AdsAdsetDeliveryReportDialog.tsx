import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, getPageNumbers } from '@/lib/utils'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { campaignReportApi } from '@/features/campaign-report/api'
import type {
  AdsInsightRow,
  AdsetInsightRow,
  DeliveryEntitiesFilterParams,
  DeliveryEntityStatusOption,
} from '@/features/campaign-report/types'
import { formatApiError } from '@/features/settings/components'
import { useAuthStore } from '@/hooks/useAuthStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryTab = 'adsets' | 'ads'

type GroupByKey = 'none' | 'date_start'

type DeliveryRow = AdsetInsightRow | AdsInsightRow

type Props = {
  trigger?: React.ReactNode
  campaignId: string
  campaignName?: string | null
  initialDateFrom?: string | null
  initialDateTo?: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE_OPTIONS = [
  { label: '10', value: '10' },
  { label: '25', value: '25' },
  { label: '50', value: '50' },
  { label: '100', value: '100' },
]

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = dayjs(value)
  return d.isValid() ? d.format('DD/MM/YYYY') : value
}

// ─── Sort header ──────────────────────────────────────────────────────────────

type SortState = { column: string | null; direction: 'asc' | 'desc' | null }

type SortHeaderProps = {
  label: React.ReactNode
  column?: string
  sort: SortState
  onSort: (column: string) => void
}

function SortHeader({ label, column, sort, onSort }: SortHeaderProps) {
  if (!column) return <span>{label}</span>
  const isActive = sort.column === column
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1 text-left hover:text-foreground"
    >
      {label}
      {isActive && sort.direction === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : isActive && sort.direction === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

// ─── Pagination bar ───────────────────────────────────────────────────────────

type PaginationBarProps = {
  page: number
  perPage: number
  rowCount: number
  onPaginationChange: (page: number, perPage: number) => void
}

function PaginationBar({ page, perPage, rowCount, onPaginationChange }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(rowCount / perPage))
  const pageNumbers = getPageNumbers(page, totalPages)
  const firstRow = rowCount === 0 ? 0 : (page - 1) * perPage + 1
  const lastRow = Math.min(rowCount, page * perPage)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/25 px-4 py-2.5">
      <span className="text-xs text-muted-foreground">
        {rowCount === 0 ? 'No results' : `Showing ${firstRow} to ${lastRow} of ${rowCount} results`}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Per page</span>
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
        <div className="ml-2 flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="hidden h-7 w-7 sm:inline-flex"
            disabled={page <= 1}
            aria-label="First page"
            onClick={() => onPaginationChange(1, perPage)}
          >
            <ChevronFirst className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page <= 1}
            aria-label="Previous page"
            onClick={() => onPaginationChange(page - 1, perPage)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          {pageNumbers.map((p, i) =>
            p === '...' ? (
              <span
                key={`ellipsis-${i}`}
                className="hidden h-7 w-7 items-center justify-center text-xs text-muted-foreground sm:flex"
              >
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'secondary' : 'outline'}
                size="icon"
                className={cn(
                  'hidden h-7 w-7 text-xs sm:inline-flex',
                  p === page && 'font-semibold',
                )}
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
            aria-label="Next page"
            onClick={() => onPaginationChange(page + 1, perPage)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden h-7 w-7 sm:inline-flex"
            disabled={page >= totalPages}
            aria-label="Last page"
            onClick={() => onPaginationChange(totalPages, perPage)}
          >
            <ChevronLast className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Column descriptors ───────────────────────────────────────────────────────

type ColDef<TRow> = {
  key: string
  label: string
  header?: React.ReactNode
  sortKey?: string
  className?: string
  render: (row: TRow) => React.ReactNode
  summary?: 'sum' | null
  summaryFormat?: 'usd' | 'number'
  summaryRender?: (totals: Record<string, number>) => React.ReactNode
}

type ColColor = 'green' | 'blue'

function ColHeader({ color, children }: { color?: ColColor; children: React.ReactNode }) {
  const dot =
    color === 'green' ? (
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
    ) : color === 'blue' ? (
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
    ) : null
  return (
    <span className="inline-flex items-center gap-1">
      {dot}
      {children}
    </span>
  )
}

// ─── Dialog body ──────────────────────────────────────────────────────────────

function AdsAdsetDeliveryReportDialogInner({
  trigger,
  campaignId,
  campaignName,
  initialDateFrom,
  initialDateTo,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = typeof controlledOpen === 'boolean'
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setDialogOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )
  const [activeTab, setActiveTab] = useState<DeliveryTab>('adsets')

  const permissions = useAuthStore((s) => s.user?.permissions ?? [])
  const canToggle = useMemo(
    () => hasPermission(permissions, PermissionSlugs.DeliveryEntitiesReportsUpdate),
    [permissions],
  )

  const buildInitialFilters = useCallback(
    (): DeliveryEntitiesFilterParams => ({
      date_from: initialDateFrom ?? null,
      date_to: initialDateTo ?? null,
      status: null,
      adset_id: null,
      adset_name: null,
      ad_id: null,
      ad_name: null,
    }),
    [initialDateFrom, initialDateTo],
  )

  const [filters, setFilters] = useState<DeliveryEntitiesFilterParams>(buildInitialFilters)
  const [adsets, setAdsets] = useState<AdsetInsightRow[]>([])
  const [ads, setAds] = useState<AdsInsightRow[]>([])
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState<Record<string, boolean>>({})

  const [statusOptions, setStatusOptions] = useState<DeliveryEntityStatusOption[]>([])
  const statusFetchedRef = useRef(false)

  const [groupBy, setGroupBy] = useState<GroupByKey>('none')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sort, setSort] = useState<SortState>({ column: null, direction: null })

  const loadData = useCallback(
    async (activeFilters: DeliveryEntitiesFilterParams) => {
      try {
        setLoading(true)
        const [adsetsRes, adsRes] = await Promise.all([
          campaignReportApi.listDeliveryAdsets(campaignId, activeFilters),
          campaignReportApi.listDeliveryAds(campaignId, activeFilters),
        ])
        setAdsets(adsetsRes.data.data)
        setAds(adsRes.data.data)
      } catch (err) {
        toast.error(formatApiError(err))
      } finally {
        setLoading(false)
      }
    },
    [campaignId],
  )

  useEffect(() => {
    if (!open) return
    void loadData(filters)
  }, [open, filters, loadData])

  useEffect(() => {
    if (!open || statusFetchedRef.current) return
    statusFetchedRef.current = true
    campaignReportApi
      .deliveryEntityStatusOptions()
      .then((res) => setStatusOptions(res.data.data.statuses))
      .catch(() => toast.error('Failed to load status options'))
  }, [open])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setDialogOpen(next)
      if (!next) {
        setFilters(buildInitialFilters())
        setAdsets([])
        setAds([])
        setActiveTab('adsets')
        setSearch('')
        setPage(1)
        setSort({ column: null, direction: null })
        setGroupBy('none')
      }
    },
    [buildInitialFilters, setDialogOpen],
  )

  // Reset pagination/search when switching tab
  useEffect(() => {
    setPage(1)
    setSearch('')
    setSort({ column: null, direction: null })
  }, [activeTab])

  const statusSelectOptions = useMemo(
    () => statusOptions.map((s) => ({ value: s.value, label: s.label })),
    [statusOptions],
  )

  const filterFields = useMemo<FilterFieldDef[]>(() => {
    const common: FilterFieldDef[] = [
      {
        field: 'date_range',
        label: 'Date',
        type: 'daterange',
        value: {
          from: filters.date_from ?? null,
          to: filters.date_to ?? null,
        },
      },
      {
        field: 'status',
        label: 'Status',
        type: 'select',
        value: filters.status ?? null,
        options: statusSelectOptions,
        placeholder: 'All',
      },
    ]
    if (activeTab === 'adsets') {
      return [
        ...common,
        {
          field: 'adset_id',
          label: 'Adset ID',
          type: 'input',
          value: filters.adset_id ?? null,
          placeholder: 'Enter Adset ID',
        },
        {
          field: 'adset_name',
          label: 'Adset Name',
          type: 'input',
          value: filters.adset_name ?? null,
          placeholder: 'Enter Adset Name',
        },
      ]
    }
    return [
      ...common,
      {
        field: 'ad_id',
        label: 'Ad ID',
        type: 'input',
        value: filters.ad_id ?? null,
        placeholder: 'Enter Ad ID',
      },
      {
        field: 'ad_name',
        label: 'Ad Name',
        type: 'input',
        value: filters.ad_name ?? null,
        placeholder: 'Enter Ad Name',
      },
    ]
  }, [
    activeTab,
    filters.date_from,
    filters.date_to,
    filters.status,
    filters.adset_id,
    filters.adset_name,
    filters.ad_id,
    filters.ad_name,
    statusSelectOptions,
  ])

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    const range = values.date_range as { from: string | null; to: string | null } | null
    setFilters({
      date_from: range?.from ?? null,
      date_to: range?.to ?? null,
      status: (values.status as string | null) ?? null,
      adset_id: (values.adset_id as string | null) ?? null,
      adset_name: (values.adset_name as string | null) ?? null,
      ad_id: (values.ad_id as string | null) ?? null,
      ad_name: (values.ad_name as string | null) ?? null,
    })
    setPage(1)
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters(buildInitialFilters())
    setPage(1)
  }, [buildInitialFilters])

  const onClearActiveFilter = useCallback((key: keyof DeliveryEntitiesFilterParams) => {
    setFilters((prev) => {
      if (key === 'date_from' || key === 'date_to') {
        return { ...prev, date_from: null, date_to: null }
      }
      return { ...prev, [key]: null }
    })
    setPage(1)
  }, [])

  // ── Toggle status ──────────────────────────────────────────────────────────

  const onToggleAdsetStatus = useCallback(
    async (row: AdsetInsightRow, checked: boolean) => {
      if (!row.status_toggleable) return
      const next: 'ACTIVE' | 'PAUSED' = checked ? 'ACTIVE' : 'PAUSED'
      const key = `adset:${row.id}`
      setToggling((prev) => ({ ...prev, [key]: true }))
      try {
        const { data } = await campaignReportApi.toggleAdsetStatus(row.id, next)
        setAdsets((prev) => prev.map((r) => (r.id === row.id ? data.data : r)))
        toast.success(`Adset is now ${data.data.status}`)
      } catch (err) {
        toast.error(formatApiError(err))
      } finally {
        setToggling((prev) => ({ ...prev, [key]: false }))
      }
    },
    [campaignId],
  )

  const onToggleAdStatus = useCallback(
    async (row: AdsInsightRow, checked: boolean) => {
      if (!row.status_toggleable) return
      const next: 'ACTIVE' | 'PAUSED' = checked ? 'ACTIVE' : 'PAUSED'
      const key = `ad:${row.id}`
      setToggling((prev) => ({ ...prev, [key]: true }))
      try {
        const { data } = await campaignReportApi.toggleAdStatus(row.id, next)
        setAds((prev) => prev.map((r) => (r.id === row.id ? data.data : r)))
        toast.success(`Ad is now ${data.data.status}`)
      } catch (err) {
        toast.error(formatApiError(err))
      } finally {
        setToggling((prev) => ({ ...prev, [key]: false }))
      }
    },
    [campaignId],
  )

  // ── Column definitions (memoized per tab) ──────────────────────────────────

  const g = (label: string) => <ColHeader color="green">{label}</ColHeader>
  const b = (label: string) => <ColHeader color="blue">{label}</ColHeader>

  const adsetColumns = useMemo<ColDef<AdsetInsightRow>[]>(
    () => [
      // ── Identity ──
      {
        key: 'adset_id',
        label: 'Adset ID',
        sortKey: 'adset_id',
        className: 'min-w-[160px]',
        render: (r) => <span className="font-mono text-[11px]">{r.adset_id ?? '-'}</span>,
      },
      {
        key: 'adset_name',
        label: 'Adset Name',
        sortKey: 'adset_name',
        className: 'min-w-[220px]',
        render: (r) => (
          <span className="text-xs text-foreground">
            {r.adset_name ?? <span className="text-muted-foreground/50">-</span>}
          </span>
        ),
      },
      {
        key: 'account_id',
        label: 'Account ID',
        sortKey: 'account_id',
        className: 'min-w-[140px]',
        render: (r) => <span className="font-mono text-[11px]">{r.account_id ?? '-'}</span>,
      },
      {
        key: 'campaign_id',
        label: 'Campaign ID',
        sortKey: 'campaign_id',
        className: 'min-w-[140px]',
        render: (r) => <span className="font-mono text-[11px]">{r.campaign_id ?? '-'}</span>,
      },
      {
        key: 'date_start',
        label: 'Date',
        sortKey: 'date_start',
        className: 'min-w-[100px]',
        render: (r) => (
          <span className="tabular-nums text-xs text-muted-foreground">
            {formatDate(r.date_start)}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortKey: 'status',
        className: 'min-w-[110px]',
        render: (r) => <StatusBadge status={r.status} label={r.status ?? undefined} />,
      },
      {
        key: 'toggle',
        label: 'Off/On',
        className: 'min-w-[70px]',
        render: (r) => {
          const key = `adset:${r.id}`
          const isActive = (r.status ?? '').toUpperCase() === 'ACTIVE'
          return (
            <Switch
              checked={isActive}
              disabled={!r.status_toggleable || !canToggle || Boolean(toggling[key])}
              aria-label={`Toggle status for adset ${r.adset_id ?? r.id}`}
              onCheckedChange={(checked) => void onToggleAdsetStatus(r, checked)}
            />
          )
        },
      },
      // ── Metrics ──
      {
        key: 'revenue_est',
        label: 'R. Rev',
        header: g('R. Rev'),
        sortKey: 'revenue_est',
        className: 'min-w-[110px] text-right',
        summary: 'sum',
        render: (r) => (
          <span className="tabular-nums text-xs text-emerald-500">{formatUsd(r.revenue_est)}</span>
        ),
      },
      {
        key: 'spend',
        label: 'Spend',
        header: b('Spend'),
        sortKey: 'spend',
        className: 'min-w-[100px] text-right',
        summary: 'sum',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatUsd(r.spend)}</span>
        ),
      },
      {
        key: 'profit_realtime',
        label: 'Profit',
        header: g('Profit'),
        sortKey: 'profit_realtime',
        className: 'min-w-[110px] text-right',
        summary: 'sum',
        summaryRender: (totals) => {
          const v = totals.profit_realtime ?? 0
          return (
            <span
              className={`tabular-nums text-xs font-semibold ${v >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {formatUsd(v)}
            </span>
          )
        },
        render: (r) => {
          const v = r.profit_realtime
          if (v == null) return <span className="text-xs text-muted-foreground">-</span>
          return (
            <span
              className={`tabular-nums text-xs ${v >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {formatUsd(v)}
            </span>
          )
        },
      },
      {
        key: 'roi_realtime',
        label: 'R. ROI',
        header: g('R. ROI'),
        sortKey: 'roi_realtime',
        className: 'min-w-[90px] text-right',
        summaryRender: (totals) => {
          const spend = totals.spend ?? 0
          if (spend === 0) return <span className="text-xs text-muted-foreground">-</span>
          const roi = ((totals.profit_realtime ?? 0) / spend) * 100
          return (
            <span
              className={`tabular-nums text-xs font-semibold ${roi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {formatPercent(roi)}
            </span>
          )
        },
        render: (r) => {
          const v = r.roi_realtime
          if (v == null) return <span className="text-xs text-muted-foreground">-</span>
          return (
            <span
              className={`tabular-nums text-xs ${v >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {formatPercent(v)}
            </span>
          )
        },
      },
      {
        key: 'rpc_est',
        label: 'R. RPC',
        header: g('R. RPC'),
        sortKey: 'rpc_est',
        className: 'min-w-[95px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-emerald-500">{formatUsd(r.rpc_est)}</span>
        ),
      },
      {
        key: 'conversion_realtime',
        label: 'R. Conv.',
        header: g('R. Conv.'),
        sortKey: 'conversion_realtime',
        className: 'min-w-[90px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-emerald-500">{r.conversion_realtime}</span>
        ),
      },
      {
        key: 'ads_conv',
        label: 'Ads Conv.',
        header: b('Ads Conv.'),
        sortKey: 'ads_conv',
        className: 'min-w-[90px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.ads_conv ?? '-'}</span>
        ),
      },
      {
        key: 'cpa_realtime',
        label: 'R. CPA',
        header: g('R. CPA'),
        sortKey: 'cpa_realtime',
        className: 'min-w-[95px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-emerald-500">{formatUsd(r.cpa_realtime)}</span>
        ),
      },
      {
        key: 'cpa',
        label: 'ADS CPA',
        header: b('ADS CPA'),
        sortKey: 'cpa',
        className: 'min-w-[90px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatUsd(r.cpa)}</span>
        ),
      },
      // ── Remaining ──
      {
        key: 'daily_budget',
        label: 'Daily Budget',
        header: b('Daily Budget'),
        sortKey: 'daily_budget',
        className: 'min-w-[110px] text-right',
        summary: 'sum',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatUsd(r.daily_budget)}</span>
        ),
      },
      {
        key: 'impressions',
        label: 'ADS Impr',
        header: b('ADS Impr'),
        sortKey: 'impressions',
        className: 'min-w-[90px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.impressions ?? '-'}</span>
        ),
      },
      {
        key: 'clicks',
        label: 'Supply Clicks',
        header: b('Supply Clicks'),
        sortKey: 'clicks',
        className: 'min-w-[100px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.clicks ?? '-'}</span>
        ),
      },
      {
        key: 'ad_clicks',
        label: 'Ad Clicks',
        header: b('Ad Clicks'),
        sortKey: 'ad_clicks',
        className: 'min-w-[90px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.ad_clicks ?? '-'}</span>
        ),
      },
      {
        key: 'reach',
        label: 'Reach',
        header: b('Reach'),
        sortKey: 'reach',
        className: 'min-w-[80px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => <span className="tabular-nums text-xs text-blue-500">{r.reach ?? '-'}</span>,
      },
      {
        key: 'article_views',
        label: 'LP View',
        header: b('LP View'),
        sortKey: 'article_views',
        className: 'min-w-[85px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.article_views ?? '-'}</span>
        ),
      },
      {
        key: 'search_views',
        label: 'S.View',
        header: b('S.View'),
        sortKey: 'search_views',
        className: 'min-w-[80px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.search_views ?? '-'}</span>
        ),
      },
      {
        key: 'cpc',
        label: 'ADS CPC',
        header: b('ADS CPC'),
        sortKey: 'cpc',
        className: 'min-w-[85px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatUsd(r.cpc)}</span>
        ),
      },
      {
        key: 'cpm',
        label: 'CPM',
        header: b('CPM'),
        sortKey: 'cpm',
        className: 'min-w-[80px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatUsd(r.cpm)}</span>
        ),
      },
      {
        key: 'ctr',
        label: 'FB CTR',
        header: b('FB CTR'),
        sortKey: 'ctr',
        className: 'min-w-[80px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatPercent(r.ctr)}</span>
        ),
      },
      {
        key: 'inline_link_click_ctr',
        label: 'CTR Link',
        header: b('CTR Link'),
        sortKey: 'inline_link_click_ctr',
        className: 'min-w-[85px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">
            {formatPercent(r.inline_link_click_ctr)}
          </span>
        ),
      },
      {
        key: 'cost_per_inline_link_click',
        label: 'CPC Link',
        header: b('CPC Link'),
        sortKey: 'cost_per_inline_link_click',
        className: 'min-w-[88px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">
            {formatUsd(r.cost_per_inline_link_click)}
          </span>
        ),
      },
      {
        key: 'frequency',
        label: 'FB Freq',
        header: b('FB Freq'),
        sortKey: 'frequency',
        className: 'min-w-[80px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatPercent(r.frequency)}</span>
        ),
      },
    ],

    [canToggle, onToggleAdsetStatus, toggling],
  )

  const adColumns = useMemo<ColDef<AdsInsightRow>[]>(
    () => [
      // ── Identity ──
      {
        key: 'ad_id',
        label: 'Ad ID',
        sortKey: 'ad_id',
        className: 'min-w-[160px]',
        render: (r) => <span className="font-mono text-[11px]">{r.ad_id ?? '-'}</span>,
      },
      {
        key: 'ad_name',
        label: 'Ad Name',
        sortKey: 'ad_name',
        className: 'min-w-[220px]',
        render: (r) => (
          <span className="text-xs text-foreground">
            {r.ad_name ?? <span className="text-muted-foreground/50">-</span>}
          </span>
        ),
      },
      {
        key: 'adset_id',
        label: 'Adset ID',
        sortKey: 'adset_id',
        className: 'min-w-[140px]',
        render: (r) => <span className="font-mono text-[11px]">{r.adset_id ?? '-'}</span>,
      },
      {
        key: 'account_id',
        label: 'Account ID',
        sortKey: 'account_id',
        className: 'min-w-[140px]',
        render: (r) => <span className="font-mono text-[11px]">{r.account_id ?? '-'}</span>,
      },
      {
        key: 'campaign_id',
        label: 'Campaign ID',
        sortKey: 'campaign_id',
        className: 'min-w-[140px]',
        render: (r) => <span className="font-mono text-[11px]">{r.campaign_id ?? '-'}</span>,
      },
      {
        key: 'date_start',
        label: 'Date',
        sortKey: 'date_start',
        className: 'min-w-[100px]',
        render: (r) => (
          <span className="tabular-nums text-xs text-muted-foreground">
            {formatDate(r.date_start)}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortKey: 'status',
        className: 'min-w-[110px]',
        render: (r) => <StatusBadge status={r.status} label={r.status ?? undefined} />,
      },
      {
        key: 'toggle',
        label: 'Off/On',
        className: 'min-w-[70px]',
        render: (r) => {
          const key = `ad:${r.id}`
          const isActive = (r.status ?? '').toUpperCase() === 'ACTIVE'
          return (
            <Switch
              checked={isActive}
              disabled={!r.status_toggleable || !canToggle || Boolean(toggling[key])}
              aria-label={`Toggle status for ad ${r.ad_id ?? r.id}`}
              onCheckedChange={(checked) => void onToggleAdStatus(r, checked)}
            />
          )
        },
      },
      // ── Metrics (same order as adsetColumns) ──
      {
        key: 'revenue_est',
        label: 'R. Rev',
        header: g('R. Rev'),
        sortKey: 'revenue_est',
        className: 'min-w-[110px] text-right',
        summary: 'sum',
        render: (r) => (
          <span className="tabular-nums text-xs text-emerald-500">{formatUsd(r.revenue_est)}</span>
        ),
      },
      {
        key: 'spend',
        label: 'Spend',
        header: b('Spend'),
        sortKey: 'spend',
        className: 'min-w-[100px] text-right',
        summary: 'sum',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatUsd(r.spend)}</span>
        ),
      },
      {
        key: 'profit_realtime',
        label: 'Profit',
        header: g('Profit'),
        sortKey: 'profit_realtime',
        className: 'min-w-[110px] text-right',
        summary: 'sum',
        summaryRender: (totals) => {
          const v = totals.profit_realtime ?? 0
          return (
            <span
              className={`tabular-nums text-xs font-semibold ${v >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {formatUsd(v)}
            </span>
          )
        },
        render: (r) => {
          const v = r.profit_realtime
          if (v == null) return <span className="text-xs text-muted-foreground">-</span>
          return (
            <span
              className={`tabular-nums text-xs ${v >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {formatUsd(v)}
            </span>
          )
        },
      },
      {
        key: 'roi_realtime',
        label: 'R. ROI',
        header: g('R. ROI'),
        sortKey: 'roi_realtime',
        className: 'min-w-[90px] text-right',
        summaryRender: (totals) => {
          const spend = totals.spend ?? 0
          if (spend === 0) return <span className="text-xs text-muted-foreground">-</span>
          const roi = ((totals.profit_realtime ?? 0) / spend) * 100
          return (
            <span
              className={`tabular-nums text-xs font-semibold ${roi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {formatPercent(roi)}
            </span>
          )
        },
        render: (r) => {
          const v = r.roi_realtime
          if (v == null) return <span className="text-xs text-muted-foreground">-</span>
          return (
            <span
              className={`tabular-nums text-xs ${v >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {formatPercent(v)}
            </span>
          )
        },
      },
      {
        key: 'rpc_est',
        label: 'R. RPC',
        header: g('R. RPC'),
        sortKey: 'rpc_est',
        className: 'min-w-[95px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-emerald-500">{formatUsd(r.rpc_est)}</span>
        ),
      },
      {
        key: 'conversion_realtime',
        label: 'R. Conv.',
        header: g('R. Conv.'),
        sortKey: 'conversion_realtime',
        className: 'min-w-[90px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-emerald-500">{r.conversion_realtime}</span>
        ),
      },
      {
        key: 'ads_conv',
        label: 'Ads Conv.',
        header: b('Ads Conv.'),
        sortKey: 'ads_conv',
        className: 'min-w-[90px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.ads_conv ?? '-'}</span>
        ),
      },
      {
        key: 'cpa_realtime',
        label: 'R. CPA',
        header: g('R. CPA'),
        sortKey: 'cpa_realtime',
        className: 'min-w-[95px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-emerald-500">{formatUsd(r.cpa_realtime)}</span>
        ),
      },
      {
        key: 'cpa',
        label: 'ADS CPA',
        header: b('ADS CPA'),
        sortKey: 'cpa',
        className: 'min-w-[90px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatUsd(r.cpa)}</span>
        ),
      },
      {
        key: 'daily_budget',
        label: 'Daily Budget',
        header: b('Daily Budget'),
        sortKey: 'daily_budget',
        className: 'min-w-[110px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatUsd(r.daily_budget)}</span>
        ),
      },
      {
        key: 'impressions',
        label: 'ADS Impr',
        header: b('ADS Impr'),
        sortKey: 'impressions',
        className: 'min-w-[90px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.impressions ?? '-'}</span>
        ),
      },
      {
        key: 'clicks',
        label: 'Supply Clicks',
        header: b('Supply Clicks'),
        sortKey: 'clicks',
        className: 'min-w-[100px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.clicks ?? '-'}</span>
        ),
      },
      {
        key: 'ad_clicks',
        label: 'Ad Clicks',
        header: b('Ad Clicks'),
        sortKey: 'ad_clicks',
        className: 'min-w-[90px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.ad_clicks ?? '-'}</span>
        ),
      },
      {
        key: 'reach',
        label: 'Reach',
        header: b('Reach'),
        sortKey: 'reach',
        className: 'min-w-[80px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => <span className="tabular-nums text-xs text-blue-500">{r.reach ?? '-'}</span>,
      },
      {
        key: 'article_views',
        label: 'LP View',
        header: b('LP View'),
        sortKey: 'article_views',
        className: 'min-w-[85px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.article_views ?? '-'}</span>
        ),
      },
      {
        key: 'search_views',
        label: 'S.View',
        header: b('S.View'),
        sortKey: 'search_views',
        className: 'min-w-[80px] text-right',
        summary: 'sum',
        summaryFormat: 'number',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{r.search_views ?? '-'}</span>
        ),
      },
      {
        key: 'cpc',
        label: 'ADS CPC',
        header: b('ADS CPC'),
        sortKey: 'cpc',
        className: 'min-w-[85px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatUsd(r.cpc)}</span>
        ),
      },
      {
        key: 'cpm',
        label: 'CPM',
        header: b('CPM'),
        sortKey: 'cpm',
        className: 'min-w-[80px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatUsd(r.cpm)}</span>
        ),
      },
      {
        key: 'ctr',
        label: 'FB CTR',
        header: b('FB CTR'),
        sortKey: 'ctr',
        className: 'min-w-[80px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatPercent(r.ctr)}</span>
        ),
      },
      {
        key: 'inline_link_click_ctr',
        label: 'CTR Link',
        header: b('CTR Link'),
        sortKey: 'inline_link_click_ctr',
        className: 'min-w-[85px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">
            {formatPercent(r.inline_link_click_ctr)}
          </span>
        ),
      },
      {
        key: 'cost_per_inline_link_click',
        label: 'CPC Link',
        header: b('CPC Link'),
        sortKey: 'cost_per_inline_link_click',
        className: 'min-w-[88px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">
            {formatUsd(r.cost_per_inline_link_click)}
          </span>
        ),
      },
      {
        key: 'frequency',
        label: 'FB Freq',
        header: b('FB Freq'),
        sortKey: 'frequency',
        className: 'min-w-[80px] text-right',
        render: (r) => (
          <span className="tabular-nums text-xs text-blue-500">{formatPercent(r.frequency)}</span>
        ),
      },
    ],

    [canToggle, onToggleAdStatus, toggling],
  )

  // ── Derived data: search + sort (grouping is visual only) ─────────────────

  const rawRows: DeliveryRow[] = activeTab === 'adsets' ? adsets : ads

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rawRows
    const q = search.trim().toLowerCase()
    if (activeTab === 'adsets') {
      return (rawRows as AdsetInsightRow[]).filter((r) =>
        [r.adset_id, r.adset_name, r.account_id, r.campaign_id]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    }
    return (rawRows as AdsInsightRow[]).filter((r) =>
      [r.ad_id, r.ad_name, r.account_id, r.campaign_id, r.adset_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [rawRows, search, activeTab])

  const sortedRows = useMemo(() => {
    if (!sort.column || !sort.direction) return filteredRows
    const { column, direction } = sort
    const sign = direction === 'asc' ? 1 : -1
    const toComparable = (value: unknown): number | string | null => {
      if (value == null) return null
      if (typeof value === 'number' || typeof value === 'string') return value
      if (typeof value === 'boolean') return value ? 1 : 0
      return null
    }
    return [...filteredRows].sort((a, b) => {
      const av = toComparable((a as unknown as Record<string, unknown>)[column])
      const bv = toComparable((b as unknown as Record<string, unknown>)[column])
      if (av === null && bv === null) return 0
      if (av === null) return -1 * sign
      if (bv === null) return 1 * sign
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign
      return String(av).localeCompare(String(bv)) * sign
    })
  }, [filteredRows, sort])

  const totalCount = sortedRows.length
  const currentPage = Math.min(page, Math.max(1, Math.ceil(totalCount / perPage)))
  const pageRows = useMemo(
    () => sortedRows.slice((currentPage - 1) * perPage, currentPage * perPage),
    [sortedRows, currentPage, perPage],
  )

  // Group rows by date when requested; summaries are kept for ALL rows
  const groupedRows = useMemo(() => {
    if (groupBy !== 'date_start') return null
    const map = new Map<string, DeliveryRow[]>()
    for (const row of pageRows) {
      const key = row.date_start ?? '—'
      const existing = map.get(key) ?? []
      existing.push(row)
      map.set(key, existing)
    }
    return Array.from(map.entries())
  }, [pageRows, groupBy])

  const onSortColumn = useCallback((column: string) => {
    setSort((prev) => {
      if (prev.column !== column) return { column, direction: 'asc' }
      if (prev.direction === 'asc') return { column, direction: 'desc' }
      if (prev.direction === 'desc') return { column: null, direction: null }
      return { column, direction: 'asc' }
    })
  }, [])

  const onPaginationChange = useCallback((nextPage: number, nextPerPage: number) => {
    setPage(nextPage)
    setPerPage(nextPerPage)
  }, [])

  // ── Render helpers tied to current tab ────────────────────────────────────

  const columns = (activeTab === 'adsets' ? adsetColumns : adColumns) as ColDef<DeliveryRow>[]

  const summaryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const col of columns) {
      if (col.summary !== 'sum') continue
      totals[col.key] = sortedRows.reduce((sum, row) => {
        const v = (row as unknown as Record<string, unknown>)[col.key]
        const n = typeof v === 'number' ? v : Number(v ?? 0)
        return Number.isFinite(n) ? sum + n : sum
      }, 0)
    }
    return totals
  }, [columns, sortedRows])

  const activeChips = useMemo(() => {
    const chips: Array<{ key: keyof DeliveryEntitiesFilterParams; label: string }> = []
    if (filters.date_from || filters.date_to) {
      chips.push({
        key: 'date_from',
        label: `Date: Period ${formatDate(filters.date_from)} - ${formatDate(filters.date_to)}`,
      })
    }
    if (filters.status) {
      const label = statusOptions.find((o) => o.value === filters.status)?.label ?? filters.status
      chips.push({ key: 'status', label: `Status: ${label}` })
    }
    if (activeTab === 'adsets') {
      if (filters.adset_id) chips.push({ key: 'adset_id', label: `Adset ID: ${filters.adset_id}` })
      if (filters.adset_name)
        chips.push({ key: 'adset_name', label: `Adset Name: ${filters.adset_name}` })
    } else {
      if (filters.ad_id) chips.push({ key: 'ad_id', label: `Ad ID: ${filters.ad_id}` })
      if (filters.ad_name) chips.push({ key: 'ad_name', label: `Ad Name: ${filters.ad_name}` })
    }
    return chips
  }, [filters, statusOptions, activeTab])

  const title = campaignName
    ? `Ads/Adset Report: ${campaignName}`
    : `Ads/Adset Report: ${campaignId}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button size="sm">Ads / Adset Report</Button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        className="flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 p-0 sm:h-[92vh] sm:w-[92vw] sm:max-w-[1200px]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <DialogTitle className="truncate">{title}</DialogTitle>
            </div>
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

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DeliveryTab)}>
            <TabsList variant="line">
              <TabsTrigger value="adsets">Adsets</TabsTrigger>
              <TabsTrigger value="ads">Ads</TabsTrigger>
            </TabsList>
          </Tabs>

          <FilterPanel
            fields={filterFields}
            onReset={onFilterReset}
            applyMode
            onApply={onApplyFilters}
          />

          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card shadow-sm">
            {/* Table toolbar */}
            <div className="flex flex-col gap-2 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Group by</span>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByKey)}>
                  <SelectTrigger size="sm" className="w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    <SelectItem value="date_start">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-full sm:ml-auto sm:w-64">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search…"
                  className="h-8 w-full pl-8 text-xs"
                />
              </div>
            </div>

            {/* Active chips */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Active filters
                </span>
                {activeChips.map((chip) => (
                  <Badge
                    key={chip.key}
                    variant="secondary"
                    className="gap-1 text-[11px] font-normal"
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={() => onClearActiveFilter(chip.key)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Clear ${chip.label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Table */}
            <div className="relative overflow-auto">
              {loading && totalCount > 0 && (
                <div className="absolute inset-0 z-20 flex items-start justify-end bg-background/40 pr-4 pt-4 backdrop-blur-[1px]">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm ring-1 ring-border/60">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading…
                  </div>
                </div>
              )}
              <Table className="text-[13px]">
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="h-12 border-border/70 bg-muted/45 hover:bg-muted/45">
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={cn(
                          'h-12 whitespace-nowrap bg-transparent text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
                          col.className,
                        )}
                      >
                        <SortHeader
                          label={col.header ?? col.label}
                          column={col.sortKey}
                          sort={sort}
                          onSort={onSortColumn}
                        />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading && totalCount === 0 && (
                    <TableRow className="h-20 border-border/70 hover:bg-transparent">
                      <TableCell
                        colSpan={columns.length}
                        className="h-20 whitespace-normal text-center"
                      >
                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && totalCount === 0 && (
                    <TableRow className="h-20 border-border/70 hover:bg-transparent">
                      <TableCell
                        colSpan={columns.length}
                        className="h-20 whitespace-normal text-center"
                      >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <BarChart3 className="h-7 w-7 opacity-30" />
                          <p className="text-sm">No delivery data for the selected filters.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {groupedRows
                    ? groupedRows.map(([dateKey, rows]) => (
                        <RowGroup key={dateKey} dateKey={dateKey} rows={rows} columns={columns} />
                      ))
                    : pageRows.map((row) => (
                        <TableRow
                          key={`${activeTab}-${row.id}`}
                          className="h-12 border-border/70 bg-background hover:bg-muted/20"
                        >
                          {columns.map((col) => (
                            <TableCell key={col.key} className={col.className}>
                              {col.render(row)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}

                  {/* Summary row */}
                  {totalCount > 0 && (
                    <TableRow className="border-t border-border/70 bg-muted/30 hover:bg-muted/30">
                      {columns.map((col, idx) => (
                        <TableCell key={col.key} className={cn('font-semibold', col.className)}>
                          {idx === 0 ? (
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Summary
                            </span>
                          ) : col.summaryRender ? (
                            col.summaryRender(summaryTotals)
                          ) : col.summary === 'sum' ? (
                            <span className="tabular-nums text-xs font-semibold">
                              {col.summaryFormat === 'number'
                                ? summaryTotals[col.key].toLocaleString()
                                : formatUsd(summaryTotals[col.key])}
                            </span>
                          ) : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <PaginationBar
              page={currentPage}
              perPage={perPage}
              rowCount={totalCount}
              onPaginationChange={onPaginationChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Grouped rows helper ──────────────────────────────────────────────────────

type RowGroupProps = {
  dateKey: string
  rows: DeliveryRow[]
  columns: ColDef<DeliveryRow>[]
}

function RowGroup({ dateKey, rows, columns }: RowGroupProps) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell
          colSpan={columns.length}
          className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {formatDate(dateKey)} · {rows.length} record(s)
        </TableCell>
      </TableRow>
      {rows.map((row) => (
        <TableRow key={row.id} className="h-12 border-border/70 bg-background hover:bg-muted/20">
          {columns.map((col) => (
            <TableCell key={col.key} className={col.className}>
              {col.render(row)}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export const AdsAdsetDeliveryReportDialog = memo(AdsAdsetDeliveryReportDialogInner)
