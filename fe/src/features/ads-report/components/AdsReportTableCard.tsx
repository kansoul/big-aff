import { memo, useCallback, useMemo } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { Table2 } from 'lucide-react'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import type { SearchableSelectOption } from '@/components/common/SearchableSelect'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { Badge } from '@/components/ui/badge'
import type {
  AdsReportFilterParams,
  AdsReportOrder,
  AdsReportRow,
  AdsReportType,
} from '@/features/ads-report/types'

type AdsReportTableCardProps = {
  data: AdsReportRow[]
  rowCount: number
  loading: boolean
  filters: AdsReportFilterParams
  mainTeamOptions: SearchableSelectOption[]
  accountOptions: SearchableSelectOption[]
  campaignOptions: SearchableSelectOption[]
  onFilterChange: (patch: Partial<AdsReportFilterParams>) => void
  onFilterReset: () => void
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: string | null, order: AdsReportOrder | null) => void
}

function parseNullableId(value: unknown): number | null | undefined {
  if (value == null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    return undefined
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function parseDateRange(value: unknown): DateRangeValue | null {
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const next = value as DateRangeValue
    return {
      from: next.from ?? null,
      to: next.to ?? null,
    }
  }
  return null
}

function getColumns(): MRT_ColumnDef<AdsReportRow>[] {
  return [
    {
      accessorKey: 'date',
      header: 'Date',
      size: 120,
    },
    {
      accessorKey: 'main_team_name',
      header: 'Main Team',
      size: 160,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      size: 120,
      Cell: ({ row }) => <span className="capitalize">{row.original.type}</span>,
    },
    {
      accessorKey: 'account_name',
      header: 'Account',
      size: 180,
    },
    {
      accessorKey: 'campaign_name',
      header: 'Campaign',
      size: 220,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 120,
      Cell: ({ row }) => {
        const status = row.original.status
        const className =
          status === 'active'
            ? 'bg-emerald-500/15 text-emerald-500'
            : status === 'paused'
              ? 'bg-amber-500/15 text-amber-500'
              : 'bg-rose-500/15 text-rose-500'

        return <Badge className={className}>{status}</Badge>
      },
    },
    {
      accessorKey: 'spend',
      header: 'Spend',
      size: 130,
      Cell: ({ row }) => (
        <span className="tabular-nums">
          ${row.original.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      size: 130,
      Cell: ({ row }) => (
        <span className="tabular-nums">
          ${row.original.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: 'profit',
      header: 'Profit',
      size: 130,
      accessorFn: (row) => row.revenue - row.spend,
      Cell: ({ row }) => {
        const profit = row.original.revenue - row.original.spend
        return (
          <span className={`tabular-nums ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        )
      },
    },
    {
      accessorKey: 'impressions',
      header: 'Impressions',
      size: 140,
      Cell: ({ row }) => (
        <span className="tabular-nums">{row.original.impressions.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'clicks',
      header: 'Clicks',
      size: 120,
      Cell: ({ row }) => (
        <span className="tabular-nums">{row.original.clicks.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'reach',
      header: 'Reach',
      size: 120,
      Cell: ({ row }) => (
        <span className="tabular-nums">{row.original.reach.toLocaleString()}</span>
      ),
    },
  ]
}

function AdsReportTableCardInner({
  data,
  rowCount,
  loading,
  filters,
  mainTeamOptions,
  accountOptions,
  campaignOptions,
  onFilterChange,
  onFilterReset,
  onPaginationChange,
  onSortingChange,
}: AdsReportTableCardProps) {
  const columns = useMemo(() => getColumns(), [])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'date_range',
        label: 'Date Range',
        type: 'daterange',
        value: {
          from: filters.date_from ?? null,
          to: filters.date_to ?? null,
        },
        placeholder: 'Select date range',
      },
      {
        field: 'main_team_id',
        label: 'Main Team',
        type: 'select',
        value: filters.main_team_id != null ? String(filters.main_team_id) : null,
        options: mainTeamOptions,
        placeholder: 'All teams',
      },
      {
        field: 'type',
        label: 'Type',
        type: 'select',
        value: filters.type ?? null,
        options: [
          { value: 'facebook', label: 'Facebook' },
          { value: 'google', label: 'Google' },
          { value: 'tiktok', label: 'TikTok' },
          { value: 'other', label: 'Other' },
        ],
        placeholder: 'All types',
      },
      {
        field: 'account_id',
        label: 'Account',
        type: 'select',
        value: filters.account_id != null ? String(filters.account_id) : null,
        options: accountOptions,
        placeholder: 'All accounts',
      },
      {
        field: 'campaign_id',
        label: 'Campaign',
        type: 'select',
        value: filters.campaign_id != null ? String(filters.campaign_id) : null,
        options: campaignOptions,
        placeholder: 'All campaigns',
      },
    ],
    [filters, mainTeamOptions, accountOptions, campaignOptions],
  )

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )

  const onApplyFilters = useCallback(
    (values: Record<string, unknown>) => {
      const range = parseDateRange(values.date_range)

      onFilterChange({
        date_from: range?.from ?? undefined,
        date_to: range?.to ?? undefined,
        main_team_id: parseNullableId(values.main_team_id),
        type: (values.type as AdsReportType | null) ?? undefined,
        account_id: parseNullableId(values.account_id),
        campaign_id: parseNullableId(values.campaign_id),
      })
    },
    [onFilterChange],
  )

  const table = useMantineReactTable({
    data,
    columns,
    manualPagination: true,
    manualSorting: true,
    rowCount,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    initialState: {
      density: 'md',
    },
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 20,
      },
      sorting,
    },
    onPaginationChange: (updater) => {
      const current = {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 20,
      }
      const next = typeof updater === 'function' ? updater(current) : updater
      onPaginationChange(next.pageIndex + 1, next.pageSize)
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      if (next.length === 0) {
        onSortingChange(null, null)
      } else {
        onSortingChange(next[0].id, next[0].desc ? 'desc' : 'asc')
      }
    },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col gap-4 rounded-md border bg-muted/20 p-4">
        <div className="flex w-full items-center justify-end gap-2">
          <MRT_ToggleGlobalFilterButton table={t} />
          <MRT_ShowHideColumnsButton table={t} />
        </div>
        <FilterPanel
          fields={filterFields}
          onReset={onFilterReset}
          applyMode
          onApply={onApplyFilters}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <Table2 className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No report rows found.</p>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const AdsReportTableCard = memo(AdsReportTableCardInner)
