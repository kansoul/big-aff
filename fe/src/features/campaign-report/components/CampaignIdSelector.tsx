import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Hash, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  FilterPanel,
  type FilterFieldDef,
  type SelectOption,
} from '@/components/common/FilterPanel'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { campaignReportApi } from '@/features/campaign-report/api'
import type {
  CampaignReportFiltersResponse,
  CampaignSelectorFilterParams,
  CampaignSelectorOrderBy,
  CampaignSelectorRow,
} from '@/features/campaign-report/types'
import { optionsApi } from '@/shared/api/options'
import { cn, getPageNumbers } from '@/lib/utils'
import { AdsSelectorTab } from './AdsSelectorTab'
import { AdsetsSelectorTab } from './AdsetsSelectorTab'

// ─── Constants ─────────────────────────────────────────────────────────────────

type SelectorTab = 'campaigns' | 'ads' | 'adsets'

const PER_PAGE_OPTIONS = [
  { label: '30', value: '30' },
  { label: '50', value: '50' },
  { label: '100', value: '100' },
]
const SEARCH_DEBOUNCE_MS = 400
const MAX_COPY_IDS = 2000

function createDefaultFilters(): CampaignSelectorFilterParams {
  return {
    page: 1,
    per_page: 30,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const next = Number(value)
    return Number.isFinite(next) ? next : 0
  }
  return 0
}

function parseStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseIntegerOrNull(value: unknown): number | null {
  if (value == null || value === '') return null
  const next = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(next) || !Number.isInteger(next)) return null
  return next
}

function parseNonNegativeNumberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null
  const next = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(next) || next < 0) return null
  return next
}

function numberToInput(value: number | null | undefined): string | null {
  return value != null ? String(value) : null
}

// ─── Table column definitions ─────────────────────────────────────────────────

type ColDef = {
  key: string
  label: string
  orderBy?: CampaignSelectorOrderBy
  className?: string
  render: (row: CampaignSelectorRow) => React.ReactNode
}

const COLUMNS: ColDef[] = [
  {
    key: 'campaign_id',
    label: 'Campaign ID',
    orderBy: 'campaign_id',
    className: 'min-w-[220px]',
    render: (row) => <span className="font-mono text-xs text-foreground">{row.campaign_id}</span>,
  },
  {
    key: 'campaign_name',
    label: 'Name',
    orderBy: 'campaign_name',
    className: 'min-w-[320px]',
    render: (row) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{row.campaign_name ?? '—'}</span>
        <span className="text-[11px] text-muted-foreground">
          {row.account_name
            ? `${row.account_name}${row.account_id ? ` (${row.account_id})` : ''}`
            : (row.account_id ?? '—')}
        </span>
      </div>
    ),
  },
  {
    key: 'total_spend',
    label: 'Spend',
    orderBy: 'total_spend',
    className: 'min-w-[140px] text-right',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">
        {formatUsd(toNumber(row.total_spend))}
      </span>
    ),
  },
  {
    key: 'total_revenue',
    label: 'Revenue',
    orderBy: 'total_revenue',
    className: 'min-w-[140px] text-right',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">
        {formatUsd(toNumber(row.total_revenue))}
      </span>
    ),
  },
  {
    key: 'profit',
    label: 'Profit',
    orderBy: 'profit',
    className: 'min-w-[140px] text-right',
    render: (row) => {
      const profit = toNumber(row.profit)
      return (
        <span
          className={cn(
            'tabular-nums font-medium',
            profit > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : profit < 0
                ? 'text-destructive'
                : 'text-muted-foreground',
          )}
        >
          {formatUsd(profit)}
        </span>
      )
    },
  },
]

// ─── Sort header ──────────────────────────────────────────────────────────────

type SortHeaderProps = {
  col: ColDef
  orderBy: CampaignSelectorOrderBy | null | undefined
  order: 'asc' | 'desc' | null | undefined
  onSort: (orderBy: CampaignSelectorOrderBy | null, order: 'asc' | 'desc' | null) => void
}

function SortHeader({ col, orderBy, order, onSort }: SortHeaderProps) {
  if (!col.orderBy) return <span>{col.label}</span>

  const isActive = orderBy === col.orderBy
  const currentOrder = isActive ? order : null

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
      className={cn(
        'inline-flex items-center gap-1 transition-colors hover:text-foreground',
        col.className?.includes('text-right') && 'ml-auto',
      )}
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

type PaginationBarProps = {
  page: number
  perPage: number
  rowCount: number
  onPaginationChange: (page: number, perPage: number) => void
}

function PaginationBar({ page, perPage, rowCount, onPaginationChange }: PaginationBarProps) {
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
            {PER_PAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground sm:hidden">
          {page}/{totalPages}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {pageNumbers.map((value, index) =>
          value === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className="hidden h-7 w-7 items-center justify-center text-xs text-muted-foreground sm:flex"
            >
              …
            </span>
          ) : (
            <Button
              key={value}
              variant={value === page ? 'secondary' : 'outline'}
              size="icon"
              className={cn('h-7 w-7 text-xs', value === page && 'font-semibold')}
              disabled={value === page}
              onClick={() => onPaginationChange(value, perPage)}
            >
              {value}
            </Button>
          ),
        )}
      </div>
    </div>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

type CampaignIdSelectorProps = {
  filterOptions: CampaignReportFiltersResponse['data']
  trigger?: React.ReactNode
  role: import('@/shared/types').RBACRole
}

function CampaignIdSelectorInner({ filterOptions, trigger, role }: CampaignIdSelectorProps) {
  const [open, setOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SelectorTab>('campaigns')
  const [filters, setFilters] = useState<CampaignSelectorFilterParams>(createDefaultFilters)
  const [searchInput, setSearchInput] = useState('')
  const [data, setData] = useState<CampaignSelectorRow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [fetching, setFetching] = useState(false)
  const [styleOptions, setStyleOptions] = useState<SelectOption[]>([])
  const [adsResetSignal, setAdsResetSignal] = useState(0)
  const [adsetsResetSignal, setAdsetsResetSignal] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    optionsApi
      .styles()
      .then((styleOptions) => {
        if (cancelled) return

        const styles: SelectOption[] = styleOptions.map((style) => ({
          value: style.code,
          label: style.name ? `${style.name} (${style.code})` : style.code,
        }))

        setStyleOptions(styles)
      })
      .catch(() => {
        toast.error('Failed to load style options')
      })

    return () => {
      cancelled = true
    }
  }, [open])

  const loadData = useCallback(async (activeFilters: CampaignSelectorFilterParams) => {
    try {
      setFetching(true)
      const { data: response } = await campaignReportApi.listCampaignSelector(activeFilters)
      setData(response.data)
      setRowCount(response.pagination.total)
    } catch {
      toast.error('Failed to load campaigns')
      setData([])
      setRowCount(0)
    } finally {
      setFetching(false)
    }
  }, [])

  const accountOptions = useMemo<SelectOption[]>(
    () =>
      filterOptions.accounts.map((account) => ({
        value: account.account_id,
        label: account.account_name
          ? `${account.account_name} (${account.account_id})`
          : account.account_id,
      })),
    [filterOptions.accounts],
  )

  const userOptions = useMemo<SelectOption[]>(
    () =>
      filterOptions.users.map((user) => ({
        value: String(user.id),
        label: user.name,
      })),
    [filterOptions.users],
  )

  const campaignOptions = useMemo<SelectOption[]>(
    () =>
      filterOptions.campaigns.map((campaign) => ({
        value: campaign.campaign_id,
        label: campaign.campaign_name
          ? `${campaign.campaign_name} (${campaign.campaign_id})`
          : campaign.campaign_id,
      })),
    [filterOptions.campaigns],
  )

  const resetCampaignTab = useCallback(() => {
    setCopyDialogOpen(false)
    setFilters(createDefaultFilters())
    setSearchInput('')
    setData([])
    setRowCount(0)
  }, [])

  useEffect(() => {
    if (!open) return

    const timeoutId = window.setTimeout(() => {
      const nextSearch = searchInput.length > 0 ? searchInput : null

      setFilters((prev) => {
        if ((prev.search ?? null) === nextSearch) return prev

        return {
          ...prev,
          search: nextSearch,
          page: 1,
        }
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [open, searchInput])

  useEffect(() => {
    setSearchInput(filters.search ?? '')
  }, [filters.search])

  useEffect(() => {
    if (!open || activeTab !== 'campaigns') return
    void loadData(filters)
  }, [open, activeTab, filters, loadData])

  const handleTabChange = useCallback(
    (value: string) => {
      const nextTab = value as SelectorTab

      setCopyDialogOpen(false)
      setActiveTab(nextTab)

      if (nextTab === 'campaigns') {
        resetCampaignTab()
        return
      }

      if (nextTab === 'ads') {
        setAdsResetSignal((prev) => prev + 1)
        return
      }

      setAdsetsResetSignal((prev) => prev + 1)
    },
    [resetCampaignTab],
  )

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (!next) {
        setActiveTab('campaigns')
        resetCampaignTab()
      }
    },
    [resetCampaignTab],
  )

  const onSort = useCallback(
    (orderBy: CampaignSelectorOrderBy | null, order: 'asc' | 'desc' | null) => {
      setFilters((prev) => ({
        ...prev,
        order_by: orderBy ?? undefined,
        order: order ?? undefined,
        page: 1,
      }))
    },
    [],
  )

  const onPaginationChange = useCallback((page: number, perPage: number) => {
    setFilters((prev) => ({ ...prev, page, per_page: perPage }))
  }, [])

  const onFilterApply = useCallback((values: Record<string, unknown>) => {
    setFilters((prev) => ({
      ...prev,
      account_id: parseStringOrNull(values.account_id),
      user_id: parseIntegerOrNull(values.user_id),
      style_code: parseStringOrNull(values.style_code),
      min_spend: parseNonNegativeNumberOrNull(values.min_spend),
      min_revenue: parseNonNegativeNumberOrNull(values.min_revenue),
      min_profit: parseNonNegativeNumberOrNull(values.min_profit),
      page: 1,
    }))
  }, [])

  const onFilterReset = useCallback(() => {
    resetCampaignTab()
  }, [resetCampaignTab])

  const onCopyAllIds = useCallback(() => {
    if (data.length === 0) {
      toast.info('No campaign IDs to show')
      return
    }

    setCopyDialogOpen(true)
  }, [data])

  const campaignIdsPreview = useMemo(
    () =>
      data
        .map((row) => row.campaign_id)
        .slice(0, MAX_COPY_IDS)
        .join('\n'),
    [data],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'account_id',
        label: 'Account',
        type: 'select',
        value: filters.account_id ?? null,
        options: accountOptions,
        placeholder: 'All accounts',
      },
      {
        field: 'user_id',
        label: 'User',
        type: 'select',
        value: filters.user_id != null ? String(filters.user_id) : null,
        options: userOptions,
        placeholder: 'All users',
        hidden: role.isMember,
      },
      {
        field: 'style_code',
        label: 'Style',
        type: 'select',
        value: filters.style_code ?? null,
        options: styleOptions,
        placeholder: 'All styles',
      },
      {
        field: 'min_spend',
        label: 'Min Spend',
        type: 'input',
        value: numberToInput(filters.min_spend),
        placeholder: '$',
      },
      {
        field: 'min_revenue',
        label: 'Min Revenue',
        type: 'input',
        value: numberToInput(filters.min_revenue),
        placeholder: '$',
      },
      {
        field: 'min_profit',
        label: 'Min Profit',
        type: 'input',
        value: numberToInput(filters.min_profit),
        placeholder: '$',
      },
    ],
    [
      filters.account_id,
      filters.user_id,
      filters.style_code,
      filters.min_spend,
      filters.min_revenue,
      filters.min_profit,
      accountOptions,
      userOptions,
      styleOptions,
      role,
    ],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Campaign ID Selector</Button>}
      </DialogTrigger>
      <DialogContent
        className="flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 p-0 sm:h-[95vh] sm:w-[95vw] sm:max-w-[95vw]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <DialogTitle>Campaign ID Selector</DialogTitle>
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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
            <div className="flex justify-center">
              <TabsList className="h-11 rounded-xl bg-muted/70 p-1">
                <TabsTrigger value="campaigns" className="min-w-24">
                  Campaigns
                </TabsTrigger>
                <TabsTrigger value="ads" className="min-w-20">
                  Ads
                </TabsTrigger>
                <TabsTrigger value="adsets" className="min-w-20">
                  Adsets
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="campaigns" className="mt-0 flex min-h-0 flex-1 flex-col">
              <div className="flex flex-col rounded-xl border border-border/70 bg-card shadow-sm">
                <div className="flex items-center justify-end border-b border-border/70 px-4 py-3">
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide whitespace-nowrap"
                    onClick={onCopyAllIds}
                    disabled={data.length === 0}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy All IDs
                  </Button>
                </div>

                <div className="border-b border-border/70 px-4 py-3">
                  <FilterPanel
                    fields={filterFields}
                    onReset={onFilterReset}
                    applyMode
                    onApply={onFilterApply}
                    defaultOpen={true}
                  />
                </div>

                <div className="flex items-center justify-end border-b border-border/70 px-4 py-3">
                  <div className="relative w-full sm:w-56">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search"
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>

                <div className="relative overflow-x-auto">
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
                              'h-14 whitespace-nowrap bg-transparent text-[12px] font-semibold tracking-[0.08em] text-muted-foreground',
                              col.className,
                            )}
                          >
                            <SortHeader
                              col={col}
                              orderBy={filters.order_by}
                              order={filters.order}
                              onSort={onSort}
                            />
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {fetching && data.length === 0 && (
                        <TableRow className="h-24 border-border/70 hover:bg-transparent">
                          <TableCell
                            colSpan={COLUMNS.length}
                            className="h-24 whitespace-normal text-center"
                          >
                            <div className="inline-flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading campaigns...
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {!fetching && data.length === 0 && (
                        <TableRow className="h-24 border-border/70 hover:bg-transparent">
                          <TableCell
                            colSpan={COLUMNS.length}
                            className="h-24 whitespace-normal text-center"
                          >
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                <X className="h-4 w-4" />
                              </div>
                              <p className="text-sm">No campaign reports</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {data.map((row) => (
                        <TableRow
                          key={`${row.campaign_id}-${row.account_id ?? 'unknown'}`}
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

                <PaginationBar
                  page={filters.page ?? 1}
                  perPage={filters.per_page ?? 30}
                  rowCount={rowCount}
                  onPaginationChange={onPaginationChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="ads" className="mt-0 flex min-h-0 flex-1 flex-col">
              <AdsSelectorTab
                key={`ads-${adsResetSignal}`}
                open={open}
                active={activeTab === 'ads'}
                accountOptions={accountOptions}
                campaignOptions={campaignOptions}
              />
            </TabsContent>

            <TabsContent value="adsets" className="mt-0">
              <AdsetsSelectorTab
                key={`adsets-${adsetsResetSignal}`}
                open={open}
                active={activeTab === 'adsets'}
                accountOptions={accountOptions}
                campaignOptions={campaignOptions}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Copy Campaign IDs</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Campaign IDs {data.length > MAX_COPY_IDS ? `(First ${MAX_COPY_IDS})` : ''}
            </p>
            <Textarea
              value={campaignIdsPreview}
              readOnly
              className="h-64 resize-none text-xs leading-5 "
            />
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

export const CampaignIdSelector = memo(CampaignIdSelectorInner)
