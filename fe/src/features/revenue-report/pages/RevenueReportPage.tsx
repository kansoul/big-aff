import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { BarChart3 } from 'lucide-react'
import { toast } from 'sonner'

import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Badge } from '@/components/ui/badge'
import { channelsApi } from '@/features/channels/api'
import type { ChannelOption } from '@/features/channels/types'
import type { RevenueReportRow, RevenueReportFilterParams, RevenueReportOrderBy } from '../types'
import { revenueReportApi } from '../api/revenueReportApi'

// ─── Column definitions ───────────────────────────────────────────────────────

function getColumns(): MRT_ColumnDef<RevenueReportRow>[] {
  return [
    {
      accessorKey: 'date',
      header: 'Date',
      size: 150,
      enableSorting: true,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.date}</span>,
    },
    {
      accessorKey: 'style_name',
      id: 'style_code',
      header: 'Style',
      size: 160,
      enableSorting: true,
      Cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground">{row.original.style_name}</span>
          <span className="font-mono text-[11px] text-muted-foreground/70">
            {row.original.style_code}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'channel_name',
      id: 'channel_code',
      header: 'Channel',
      size: 160,
      enableSorting: true,
      Cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">{row.original.channel_name}</span>
          <span className="inline-block w-fit rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[11px]">
            {row.original.channel_code}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'page_views',
      header: 'Page Views',
      size: 110,
      enableSorting: true,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          {row.original.page_views.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'clicks',
      header: 'Clicks',
      size: 90,
      enableSorting: true,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          {row.original.clicks.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'estimated_earnings',
      header: 'Earnings',
      size: 110,
      enableSorting: true,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <Badge variant="secondary">${row.original.estimated_earnings.toFixed(2)}</Badge>
      ),
    },
    {
      accessorKey: 'cost_per_click',
      header: 'CPC',
      size: 90,
      enableSorting: true,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          ${row.original.cost_per_click.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'ad_requests',
      header: 'Ad Requests',
      size: 110,
      enableSorting: true,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          {row.original.ad_requests.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'impressions',
      header: 'Impressions',
      size: 110,
      enableSorting: true,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          {row.original.impressions.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'ad_requests_rpm',
      header: 'RPM (Req)',
      size: 100,
      enableSorting: false,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          ${row.original.ad_requests_rpm.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'impressions_rpm',
      header: 'RPM (Imp)',
      size: 100,
      enableSorting: false,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          ${row.original.impressions_rpm.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'funnel_requests',
      header: 'Funnel Req',
      size: 110,
      enableSorting: true,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          {row.original.funnel_requests != null
            ? row.original.funnel_requests.toLocaleString()
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'funnel_impressions',
      header: 'Funnel Imp',
      size: 110,
      enableSorting: true,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          {row.original.funnel_impressions != null
            ? row.original.funnel_impressions.toLocaleString()
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'funnel_clicks',
      header: 'Funnel Clicks',
      size: 110,
      enableSorting: true,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          {row.original.funnel_clicks != null ? row.original.funnel_clicks.toLocaleString() : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'funnel_rpm',
      header: 'Funnel RPM',
      size: 110,
      enableSorting: true,
      mantineTableHeadCellProps: { style: { textAlign: 'right' } },
      mantineTableBodyCellProps: { style: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground/95">
          {row.original.funnel_rpm != null ? `$${row.original.funnel_rpm.toFixed(2)}` : '—'}
        </span>
      ),
    },
  ]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: RevenueReportFilterParams = {
  page: 1,
  per_page: 30,
}

export function RevenueReportPage() {
  const [data, setData] = useState<RevenueReportRow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<RevenueReportFilterParams>(DEFAULT_FILTERS)
  const [channelOptions, setChannelOptions] = useState<ChannelOption[]>([])

  useEffect(() => {
    channelsApi
      .options()
      .then((res) => setChannelOptions(res.data))
      .catch(() => toast.error('Failed to load channel options'))
  }, [])

  const loadData = useCallback(async (activeFilters: RevenueReportFilterParams) => {
    try {
      setLoading(true)
      const { data: response } = await revenueReportApi.listRevenue(activeFilters)
      setData(response.data)
      setRowCount(response.pagination.total)
    } catch {
      toast.error('Failed to load revenue report')
      setData([])
      setRowCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(filters)
  }, [loadData, filters])

  const onFilterChange = useCallback((patch: Partial<RevenueReportFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

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

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []

    if (filters.date_from || filters.date_to) {
      chips.push({
        key: 'date_range',
        label: 'Date',
        displayValue: `${filters.date_from ?? '…'} -> ${filters.date_to ?? '…'}`,
      })
    }
    if ((filters.channel_codes?.length ?? 0) > 0) {
      const labels = (filters.channel_codes ?? []).map((code) => {
        const option = channelOptions.find((channel) => channel.code === code)
        return option?.name ?? code
      })
      chips.push({
        key: 'channel_codes',
        label: 'Channels',
        displayValue:
          labels.length <= 2
            ? labels.join(', ')
            : `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`,
      })
    }

    return chips
  }, [filters.date_from, filters.date_to, filters.channel_codes, channelOptions])

  function handleRemoveChip(key: string) {
    if (key === 'date_range') {
      onFilterChange({ date_from: null, date_to: null })
    } else if (key === 'channel_codes') {
      onFilterChange({ channel_codes: [] })
    }
  }

  const columns = useMemo(() => getColumns(), [])

  const table = useMantineReactTable({
    data,
    columns,
    getRowId: (row) => String(row.id),
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: true,
    initialState: {
      density: 'md',
      columnVisibility: {
        ad_requests_rpm: false,
        impressions_rpm: false,
        funnel_requests: false,
        funnel_impressions: false,
        funnel_clicks: false,
        funnel_rpm: false,
      },
    },
    manualPagination: true,
    rowCount,
    manualSorting: true,
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 30,
      },
      sorting: filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : [],
    },
    onPaginationChange: (updater) => {
      const current = { pageIndex: (filters.page ?? 1) - 1, pageSize: filters.per_page ?? 30 }
      const next = typeof updater === 'function' ? updater(current) : updater
      setFilters((prev) => ({ ...prev, page: next.pageIndex + 1, per_page: next.pageSize }))
    },
    onSortingChange: (updater) => {
      const current = filters.order_by
        ? [{ id: filters.order_by, desc: filters.order === 'desc' }]
        : []
      const next = typeof updater === 'function' ? updater(current) : updater
      setFilters((prev) => ({
        ...prev,
        order_by: next[0] ? (next[0].id as RevenueReportOrderBy) : undefined,
        order: next[0] ? (next[0].desc ? 'desc' : 'asc') : undefined,
        page: 1,
      }))
    },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    localization: { rowsPerPage: 'Per Page' },
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <BarChart3 className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No report rows found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your date range or filters.</p>
        </div>
      </div>
    ),
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Revenue Report</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {rowCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <FilterPanel
            fields={filterFields}
            onReset={onFilterReset}
            applyMode
            onApply={onApplyFilters}
          />
        </div>
        <ActiveFilterChips
          chips={activeChips}
          onRemove={handleRemoveChip}
          onClearAll={onFilterReset}
        />
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}
