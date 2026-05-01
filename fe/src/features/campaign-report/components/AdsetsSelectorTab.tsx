import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from '@/lib/dayjs'
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  FilterPanel,
  type FilterFieldDef,
  type SelectOption,
} from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { campaignReportApi } from '@/features/campaign-report/api'
import type {
  AdsetsSelectorFilterParams,
  AdsetsSelectorOrderBy,
  AdsetsSelectorRow,
} from '@/features/campaign-report/types'
import { cn, getPageNumbers } from '@/lib/utils'

type AdsetsSelectorTabProps = {
  open: boolean
  active: boolean
  accountOptions: SelectOption[]
  campaignOptions: SelectOption[]
}

type AdsetsColDef = {
  key: string
  label: string
  orderBy?: AdsetsSelectorOrderBy
  className?: string
  render: (row: AdsetsSelectorRow) => React.ReactNode
}

const PER_PAGE_OPTIONS = [
  { label: '30', value: '30' },
  { label: '50', value: '50' },
  { label: '100', value: '100' },
]

const SEARCH_DEBOUNCE_MS = 400
const MAX_COPY_IDS = 2000

function createDefaultFilters(): AdsetsSelectorFilterParams {
  return {
    page: 1,
    per_page: 30,
  }
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const parsed = dayjs(value)
  if (!parsed.isValid()) return value
  return parsed.format('DD/MM/YYYY')
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

function parseNonNegativeNumberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null
  const next = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(next) || next < 0) return null
  return next
}

function parseDateRangeValue(value: unknown): DateRangeValue {
  if (!value || typeof value !== 'object') {
    return { from: null, to: null }
  }

  const next = value as { from?: unknown; to?: unknown }

  return {
    from: parseStringOrNull(next.from),
    to: parseStringOrNull(next.to),
  }
}

function numberToInput(value: number | null | undefined): string | null {
  return value != null ? String(value) : null
}

const ADSETS_COLUMNS: AdsetsColDef[] = [
  {
    key: 'adset_id',
    label: 'Adset ID',
    orderBy: 'adset_id',
    className: 'min-w-[180px]',
    render: (row) => (
      <span className="font-mono text-xs text-foreground">{row.adset_id ?? '—'}</span>
    ),
  },
  {
    key: 'adset_name',
    label: 'Name',
    orderBy: 'adset_name',
    className: 'min-w-[340px]',
    render: (row) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{row.adset_name ?? '—'}</span>
        <span className="text-[11px] text-muted-foreground">
          {row.account_id ?? '—'} · {row.campaign_id ?? '—'}
        </span>
      </div>
    ),
  },
  {
    key: 'spend',
    label: 'Spend',
    orderBy: 'spend',
    className: 'min-w-[120px] text-right',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">{formatUsd(toNumber(row.spend))}</span>
    ),
  },
  {
    key: 'cpa',
    label: 'CPA',
    orderBy: 'cpa',
    className: 'min-w-[120px] text-right',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">{formatUsd(toNumber(row.cpa))}</span>
    ),
  },
  {
    key: 'date_start',
    label: 'Date Start',
    orderBy: 'date_start',
    className: 'min-w-[140px] text-right',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">{formatDate(row.date_start)}</span>
    ),
  },
]

type SortHeaderProps = {
  col: AdsetsColDef
  orderBy: AdsetsSelectorOrderBy | null | undefined
  order: 'asc' | 'desc' | null | undefined
  onSort: (orderBy: AdsetsSelectorOrderBy | null, order: 'asc' | 'desc' | null) => void
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

function AdsetsSelectorTabInner({
  open,
  active,
  accountOptions,
  campaignOptions,
}: AdsetsSelectorTabProps) {
  const [filters, setFilters] = useState<AdsetsSelectorFilterParams>(createDefaultFilters)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [data, setData] = useState<AdsetsSelectorRow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [fetching, setFetching] = useState(false)

  const loadData = useCallback(async (activeFilters: AdsetsSelectorFilterParams) => {
    try {
      setFetching(true)
      const { data: response } = await campaignReportApi.listAdsetsSelector(activeFilters)
      setData(response.data)
      setRowCount(response.pagination.total)
    } catch {
      toast.error('Failed to load adsets')
      setData([])
      setRowCount(0)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!open || !active) return

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
  }, [open, active, searchInput])

  useEffect(() => {
    setSearchInput(filters.search ?? '')
  }, [filters.search])

  useEffect(() => {
    if (!open || !active) return
    void loadData(filters)
  }, [open, active, filters, loadData])

  const onSort = useCallback(
    (orderBy: AdsetsSelectorOrderBy | null, order: 'asc' | 'desc' | null) => {
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
    const dateStartRange = parseDateRangeValue(values.date_start_range)

    setFilters((prev) => ({
      ...prev,
      account_id: parseStringOrNull(values.account_id),
      campaign_id: parseStringOrNull(values.campaign_id),
      date_start_from: dateStartRange.from,
      date_start_to: dateStartRange.to,
      min_spend: parseNonNegativeNumberOrNull(values.min_spend),
      max_cpa: parseNonNegativeNumberOrNull(values.max_cpa),
      page: 1,
    }))
  }, [])

  const onFilterReset = useCallback(() => {
    setSearchInput('')
    setFilters(createDefaultFilters())
  }, [])

  const adsetIdsPreview = useMemo(
    () =>
      data
        .map((row) => row.adset_id?.trim())
        .filter((id): id is string => Boolean(id))
        .slice(0, MAX_COPY_IDS)
        .join('\n'),
    [data],
  )

  const onCopyAllIds = useCallback(() => {
    if (!adsetIdsPreview) {
      toast.info('No adset IDs to show')
      return
    }

    setCopyDialogOpen(true)
  }, [adsetIdsPreview])

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
        field: 'campaign_id',
        label: 'Campaign ID',
        type: 'select',
        value: filters.campaign_id ?? null,
        options: campaignOptions,
        placeholder: 'All campaigns',
      },
      {
        field: 'date_start_range',
        label: 'Date Start',
        type: 'daterange',
        value: {
          from: filters.date_start_from ?? null,
          to: filters.date_start_to ?? null,
        },
        placeholder: 'Select date range',
      },
      {
        field: 'min_spend',
        label: 'Min Spend',
        type: 'input',
        value: numberToInput(filters.min_spend),
        placeholder: '$',
      },
      {
        field: 'max_cpa',
        label: 'Max CPA',
        type: 'input',
        value: numberToInput(filters.max_cpa),
        placeholder: '$',
      },
    ],
    [
      filters.account_id,
      filters.campaign_id,
      filters.date_start_from,
      filters.date_start_to,
      filters.min_spend,
      filters.max_cpa,
      accountOptions,
      campaignOptions,
    ],
  )

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-end border-b border-border/70 px-4 py-3">
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide whitespace-nowrap"
            onClick={onCopyAllIds}
            disabled={!adsetIdsPreview}
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

        <div className="relative min-h-0 flex-1 overflow-auto">
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
                {ADSETS_COLUMNS.map((col) => (
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
                    colSpan={ADSETS_COLUMNS.length}
                    className="h-24 whitespace-normal text-center"
                  >
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading adsets...
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!fetching && data.length === 0 && (
                <TableRow className="h-24 border-border/70 hover:bg-transparent">
                  <TableCell
                    colSpan={ADSETS_COLUMNS.length}
                    className="h-24 whitespace-normal text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <X className="h-4 w-4" />
                      </div>
                      <p className="text-sm">No adsets reports</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {data.map((row) => (
                <TableRow
                  key={`${row.adset_id ?? 'unknown'}-${row.date_start ?? 'unknown'}-${row.account_id ?? 'unknown'}`}
                  className="h-14 border-border/70 bg-background hover:bg-muted/20"
                >
                  {ADSETS_COLUMNS.map((col) => (
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

      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Copy Adset IDs</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Adset IDs {data.length > MAX_COPY_IDS ? `(First ${MAX_COPY_IDS})` : ''}
            </p>
            <Textarea
              value={adsetIdsPreview}
              readOnly
              className="h-64 resize-none font-mono text-xs leading-5"
            />
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const AdsetsSelectorTab = memo(AdsetsSelectorTabInner)
