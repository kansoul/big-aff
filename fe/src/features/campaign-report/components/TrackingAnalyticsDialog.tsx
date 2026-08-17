import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart2,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Eye,
  KeyRound,
  Loader2,
  MousePointerClick,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, getPageNumbers } from '@/lib/utils'
import { campaignReportApi } from '../api'
import type {
  AnalyticsTrackingFilterOptions,
  KeywordTrackingFilterParams,
  KeywordTrackingOrderBy,
  KeywordTrackingRow,
  TrackingAnalyticsFilterParams,
  TrackingAnalyticsResponse,
} from '../types'

// ─── Stat Card ────────────────────────────────────────────────────────────────

type StatCardProps = {
  title: string
  value: number
  ctrItems: string[]
  footerLabel: string
  icon: React.ReactNode
  iconBg: string
  fetching: boolean
}

function StatCard({ title, value, ctrItems, footerLabel, icon, iconBg, fetching }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        {fetching ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
        ) : (
          value.toLocaleString()
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {!fetching &&
          ctrItems.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="select-none text-border/80">|</span>}
              <span>{item}</span>
            </span>
          ))}
        {!fetching && ctrItems.length > 0 && <span className="select-none text-border/80">|</span>}
        <span className="flex items-center gap-1.5">
          <span>{footerLabel}</span>
          <span
            className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full', iconBg)}
          >
            {icon}
          </span>
        </span>
      </div>
    </div>
  )
}

// ─── Keyword sort header ──────────────────────────────────────────────────────

type KeywordSortHeaderProps = {
  label: string
  orderBy?: KeywordTrackingOrderBy
  activeOrderBy?: KeywordTrackingOrderBy | null
  activeOrder?: 'asc' | 'desc' | null
  onSort: (orderBy: KeywordTrackingOrderBy | null, order: 'asc' | 'desc' | null) => void
}

function KeywordSortHeader({
  label,
  orderBy,
  activeOrderBy,
  activeOrder,
  onSort,
}: KeywordSortHeaderProps) {
  if (!orderBy) return <span>{label}</span>
  const isActive = activeOrderBy === orderBy
  const currentOrder = isActive ? activeOrder : null

  function handleClick() {
    if (!orderBy) return
    if (!isActive || currentOrder === null) onSort(orderBy, 'desc')
    else if (currentOrder === 'desc') onSort(orderBy, 'asc')
    else onSort(null, null)
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      onClick={handleClick}
    >
      {label}
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

// ─── Keyword pagination ───────────────────────────────────────────────────────

const PER_PAGE_OPTIONS = [
  { label: '30', value: '30' },
  { label: '50', value: '50' },
  { label: '100', value: '100' },
]

type KeywordPaginationBarProps = {
  page: number
  perPage: number
  rowCount: number
  onPaginationChange: (page: number, perPage: number) => void
}

function KeywordPaginationBar({
  page,
  perPage,
  rowCount,
  onPaginationChange,
}: KeywordPaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(rowCount / perPage))
  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/25 px-4 py-2.5">
      <div className="flex items-center gap-2">
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
        <span className="text-xs text-muted-foreground sm:hidden">
          {page}/{totalPages}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-1">
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
              className={cn('hidden h-7 w-7 text-xs sm:inline-flex', p === page && 'font-semibold')}
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
  )
}

// ─── Keyword table columns ────────────────────────────────────────────────────

type KeywordColDef = {
  key: keyof KeywordTrackingRow
  label: string
  orderBy?: KeywordTrackingOrderBy
  className?: string
  render: (row: KeywordTrackingRow) => React.ReactNode
}

const KEYWORD_COLUMNS: KeywordColDef[] = [
  {
    key: 'keyword',
    label: 'Keyword',
    orderBy: 'keyword',
    className: 'min-w-[280px]',
    render: (row) => <span className="font-medium text-foreground">{row.keyword}</span>,
  },
  {
    key: 'click_count',
    label: 'Count',
    orderBy: 'click_count',
    className: 'min-w-[100px]',
    render: (row) => <span className="tabular-nums">{row.click_count.toLocaleString()}</span>,
  },
  {
    key: 'redirect_count',
    label: 'Redirects',
    orderBy: 'redirect_count',
    className: 'min-w-[110px]',
    render: (row) => <span className="tabular-nums">{row.redirect_count.toLocaleString()}</span>,
  },
  {
    key: 'ctr',
    label: 'CTR',
    className: 'min-w-[90px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">{row.ctr.toFixed(2)}%</span>
    ),
  },
]

// ─── Keyword table state ──────────────────────────────────────────────────────

type KeywordTableState = {
  page: number
  per_page: number
  order_by: KeywordTrackingOrderBy | null
  order: 'asc' | 'desc' | null
  keyword: string | null
}

const DEFAULT_KEYWORD_STATE: KeywordTableState = {
  page: 1,
  per_page: 30,
  order_by: null,
  order: null,
  keyword: null,
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

type FilterOptions = AnalyticsTrackingFilterOptions

type TrackingAnalyticsDialogProps = {
  trigger?: React.ReactNode
  initialDate?: string | null
  initialCampaignId?: string | null
  initialAdsLinkId?: number | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function TrackingAnalyticsDialogInner({
  trigger,
  initialDate,
  initialCampaignId,
  initialAdsLinkId,
  open: controlledOpen,
  onOpenChange,
}: TrackingAnalyticsDialogProps) {
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

  // Stats
  const [fetching, setFetching] = useState(false)
  const [statsData, setStatsData] = useState<TrackingAnalyticsResponse['data'] | null>(null)

  // Shared filters
  const [filters, setFilters] = useState<TrackingAnalyticsFilterParams>(() => ({
    date_from: initialDate ?? null,
    date_to: initialDate ?? null,
    ads_link_id: initialAdsLinkId ?? null,
    campaign_id: initialCampaignId ?? null,
  }))
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const fetchedOptionsRef = useRef(false)

  // Keyword table
  const [keywordData, setKeywordData] = useState<KeywordTrackingRow[]>([])
  const [keywordRowCount, setKeywordRowCount] = useState(0)
  const [keywordFetching, setKeywordFetching] = useState(false)
  const [keywordState, setKeywordState] = useState<KeywordTableState>(DEFAULT_KEYWORD_STATE)
  const [keywordSearch, setKeywordSearch] = useState('')
  const keywordDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async (activeFilters: TrackingAnalyticsFilterParams) => {
    try {
      setFetching(true)
      const { data: response } = await campaignReportApi.trackingAnalyticsStats(activeFilters)
      setStatsData(response.data)
    } catch {
      toast.error('Failed to load tracking analytics')
      setStatsData(null)
    } finally {
      setFetching(false)
    }
  }, [])

  const loadKeywords = useCallback(
    async (sharedFilters: TrackingAnalyticsFilterParams, tableState: KeywordTableState) => {
      try {
        setKeywordFetching(true)
        const params: KeywordTrackingFilterParams = {
          ...sharedFilters,
          page: tableState.page,
          per_page: tableState.per_page,
          keyword: tableState.keyword,
          order_by: tableState.order_by,
          order: tableState.order,
        }
        const { data: response } = await campaignReportApi.listKeywords(params)
        setKeywordData(response.data)
        setKeywordRowCount(response.pagination.total)
      } catch {
        toast.error('Failed to load keyword tracking')
        setKeywordData([])
        setKeywordRowCount(0)
      } finally {
        setKeywordFetching(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!open) return
    void loadData(filters)
  }, [open, loadData, filters])

  useEffect(() => {
    if (!open) return
    void loadKeywords(filters, keywordState)
  }, [open, filters, keywordState, loadKeywords])

  useEffect(() => {
    if (!open) return
    if (keywordDebounceRef.current) clearTimeout(keywordDebounceRef.current)
    keywordDebounceRef.current = setTimeout(() => {
      setKeywordState((prev) => {
        const next = keywordSearch.trim() || null
        if (prev.keyword === next) return prev
        return { ...prev, keyword: next, page: 1 }
      })
    }, 400)
    return () => {
      if (keywordDebounceRef.current) clearTimeout(keywordDebounceRef.current)
    }
  }, [keywordSearch, open])

  useEffect(() => {
    if (!open || fetchedOptionsRef.current) return
    campaignReportApi
      .analyticsTrackingFilterOptions()
      .then((res) => {
        setFilterOptions(res.data.data)
        fetchedOptionsRef.current = true
      })
      .catch(() => {
        toast.error('Failed to load filter options')
        fetchedOptionsRef.current = false
      })
  }, [open])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setDialogOpen(next)
      if (!next) {
        setFilters({
          date_from: initialDate ?? null,
          date_to: initialDate ?? null,
          ads_link_id: initialAdsLinkId ?? null,
          campaign_id: initialCampaignId ?? null,
        })
        setStatsData(null)
        setKeywordData([])
        setKeywordRowCount(0)
        setKeywordState(DEFAULT_KEYWORD_STATE)
        setKeywordSearch('')
        fetchedOptionsRef.current = false
      }
    },
    [initialDate, initialCampaignId, initialAdsLinkId, setDialogOpen],
  )

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    const dateRange = values.date_range as { from: string | null; to: string | null } | null
    setFilters({
      date_from: dateRange?.from ?? null,
      date_to: dateRange?.to ?? null,
      ads_link_id:
        values.ads_link_id != null && values.ads_link_id !== '' ? Number(values.ads_link_id) : null,
      campaign_id: (values.campaign_id as string) || null,
    })
    setKeywordState((prev) => ({ ...prev, page: 1 }))
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters({
      date_from: initialDate ?? null,
      date_to: initialDate ?? null,
      ads_link_id: initialAdsLinkId ?? null,
      campaign_id: initialCampaignId ?? null,
    })
    setKeywordState(DEFAULT_KEYWORD_STATE)
    setKeywordSearch('')
  }, [initialDate, initialCampaignId, initialAdsLinkId])

  const onKeywordSort = useCallback(
    (orderBy: KeywordTrackingOrderBy | null, order: 'asc' | 'desc' | null) => {
      setKeywordState((prev) => ({ ...prev, order_by: orderBy, order, page: 1 }))
    },
    [],
  )

  const onKeywordPaginationChange = useCallback((page: number, perPage: number) => {
    setKeywordState((prev) => ({ ...prev, page, per_page: perPage }))
  }, [])

  const adsLinkOptions = useMemo(
    () =>
      (filterOptions?.ads_links ?? []).map((l) => ({
        label: l.slug,
        value: String(l.id),
      })),
    [filterOptions],
  )

  const campaignOptions = useMemo(
    () =>
      (filterOptions?.campaigns ?? []).map((c) => ({
        label: c,
        value: c,
      })),
    [filterOptions],
  )

  const filterFields: FilterFieldDef[] = useMemo(
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
        field: 'ads_link_id',
        label: 'Link Tracking',
        type: 'select',
        value: filters.ads_link_id != null ? String(filters.ads_link_id) : null,
        options: adsLinkOptions,
      },
      {
        field: 'campaign_id',
        label: 'Campaign',
        type: 'select',
        value: filters.campaign_id ?? null,
        options: campaignOptions,
      },
    ],
    [
      filters.date_from,
      filters.date_to,
      filters.ads_link_id,
      filters.campaign_id,
      adsLinkOptions,
      campaignOptions,
    ],
  )

  const d = statsData

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button size="sm">Tracking Analytics</Button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        className="flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 p-0 sm:h-[95vh] sm:w-[95vw] sm:max-w-[95vw]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
              <DialogTitle>Tracking Analytics</DialogTitle>
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
          <FilterPanel
            fields={filterFields}
            onReset={onFilterReset}
            applyMode
            onApply={onApplyFilters}
          />

          {/* Stats section */}
          {!fetching && !d && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <BarChart2 className="h-4 w-4 shrink-0 opacity-40" />
              <span>No analytics data available for the selected filters.</span>
            </div>
          )}

          {(fetching || d) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard
                title="Search Views"
                value={d?.views.search_views.value ?? 0}
                ctrItems={[`CTR: ${(d?.views.search_views.ctr ?? 0).toFixed(2)}%`]}
                footerLabel="Total search page views"
                icon={<Eye className="h-3 w-3" />}
                iconBg="bg-red-500/15 text-red-500"
                fetching={fetching}
              />
              <StatCard
                title="Article Views"
                value={d?.views.article_views.value ?? 0}
                ctrItems={[]}
                footerLabel="Total article page views"
                icon={<Eye className="h-3 w-3" />}
                iconBg="bg-emerald-500/15 text-emerald-500"
                fetching={fetching}
              />
              <StatCard
                title="Search Ad Clicks"
                value={d?.clicks.search_ad_clicks.value ?? 0}
                ctrItems={[
                  `CTR: ${(d?.clicks.search_ad_clicks.ctr ?? 0).toFixed(2)}%`,
                  `CTR LDP: ${(d?.clicks.search_ad_clicks.ctr_ldp ?? 0).toFixed(2)}%`,
                ]}
                footerLabel="Total search ad clicks"
                icon={<Sparkles className="h-3 w-3" />}
                iconBg="bg-yellow-500/15 text-yellow-500"
                fetching={fetching}
              />
              <StatCard
                title="Article Keyword Clicks"
                value={d?.clicks.article_ad_clicks.value ?? 0}
                ctrItems={[`CTR: ${(d?.clicks.article_ad_clicks.ctr ?? 0).toFixed(2)}%`]}
                footerLabel="Total article keyword clicks"
                icon={<MousePointerClick className="h-3 w-3" />}
                iconBg="bg-blue-500/15 text-blue-500"
                fetching={fetching}
              />
              <StatCard
                title="Failed Search Ad Loads"
                value={d?.loads.failed_search_ad_loads.value ?? 0}
                ctrItems={[`CTR: ${(d?.loads.failed_search_ad_loads.ctr ?? 0).toFixed(2)}%`]}
                footerLabel="Failed search ad loads"
                icon={<AlertTriangle className="h-3 w-3" />}
                iconBg="bg-orange-500/15 text-orange-500"
                fetching={fetching}
              />
              <StatCard
                title="Failed Article Ad Loads"
                value={d?.loads.failed_article_ad_loads.value ?? 0}
                ctrItems={[`CTR: ${(d?.loads.failed_article_ad_loads.ctr ?? 0).toFixed(2)}%`]}
                footerLabel="Failed article ad loads"
                icon={<AlertTriangle className="h-3 w-3" />}
                iconBg="bg-orange-500/15 text-orange-500"
                fetching={fetching}
              />
            </div>
          )}

          {/* Keyword tracking table */}
          <div className="rounded-xl border border-border/70 bg-card shadow-sm">
            {/* Table header with search */}
            <div className="flex flex-col gap-2 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Keyword Tracking</span>
              </div>
              <div className="relative w-full sm:ml-auto sm:w-52">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keywordSearch}
                  onChange={(e) => setKeywordSearch(e.target.value)}
                  placeholder="Search keyword…"
                  className="h-8 w-52 pl-8 text-xs"
                />
              </div>
            </div>

            {/* Scrollable table */}
            <div className="relative overflow-auto">
              {keywordFetching && keywordData.length > 0 && (
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
                    {KEYWORD_COLUMNS.map((col) => (
                      <TableHead
                        key={col.key}
                        className={cn(
                          'h-14 whitespace-nowrap bg-transparent text-[12px] font-semibold tracking-[0.08em] text-muted-foreground uppercase',
                          col.className,
                        )}
                      >
                        <KeywordSortHeader
                          label={col.label}
                          orderBy={col.orderBy}
                          activeOrderBy={keywordState.order_by}
                          activeOrder={keywordState.order}
                          onSort={onKeywordSort}
                        />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {keywordFetching && keywordData.length === 0 && (
                    <TableRow className="h-20 border-border/70 hover:bg-transparent">
                      <TableCell
                        colSpan={KEYWORD_COLUMNS.length}
                        className="h-20 whitespace-normal text-center"
                      >
                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading keywords...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!keywordFetching && keywordData.length === 0 && (
                    <TableRow className="h-20 border-border/70 hover:bg-transparent">
                      <TableCell
                        colSpan={KEYWORD_COLUMNS.length}
                        className="h-20 whitespace-normal text-center"
                      >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <KeyRound className="h-7 w-7 opacity-30" />
                          <p className="text-sm">No keywords found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {keywordData.map((row) => (
                    <TableRow
                      key={row.id}
                      className="h-12 border-border/70 bg-background hover:bg-muted/20"
                    >
                      {KEYWORD_COLUMNS.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <KeywordPaginationBar
              page={keywordState.page}
              perPage={keywordState.per_page}
              rowCount={keywordRowCount}
              onPaginationChange={onKeywordPaginationChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const TrackingAnalyticsDialog = memo(TrackingAnalyticsDialogInner)
