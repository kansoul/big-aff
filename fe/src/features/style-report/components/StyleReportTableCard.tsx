import { memo, useCallback, useMemo } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { BarChart3 } from 'lucide-react'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Badge } from '@/components/ui/badge'
import type {
  StyleReportFilterParams,
  StyleReportOrder,
  StyleReportRow,
} from '@/features/style-report/types'

function getColumns(): MRT_ColumnDef<StyleReportRow>[] {
  return [
    {
      accessorKey: 'date',
      header: 'Date',
      size: 140,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.date}</span>,
    },
    {
      accessorKey: 'style_name',
      header: 'Style Name',
      size: 220,
      Cell: ({ row }) => <span className="text-foreground">{row.original.style_name}</span>,
    },
    {
      accessorKey: 'channel_name',
      header: 'Channel Name',
      size: 220,
      Cell: ({ row }) => <span className="text-muted-foreground">{row.original.channel_name}</span>,
    },
    {
      accessorKey: 'page_views',
      header: 'Page Views',
      size: 130,
      Cell: ({ row }) => (
        <span className="tabular-nums">{row.original.page_views.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'clicks',
      header: 'Clicks',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums">{row.original.clicks.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'earnings',
      header: 'Earnings',
      size: 120,
      Cell: ({ row }) => {
        const value = row.original.earnings
        return <Badge variant="secondary">${value.toFixed(2)}</Badge>
      },
    },
    {
      accessorKey: 'cpc',
      header: 'CPC',
      size: 100,
      Cell: ({ row }) => {
        const value = row.original.cpc
        return <span className="tabular-nums text-muted-foreground">${value.toFixed(2)}</span>
      },
    },
  ]
}

type StyleReportTableCardProps = {
  data: StyleReportRow[]
  rowCount: number
  loading: boolean
  filters: StyleReportFilterParams
  onFilterChange: (patch: Partial<StyleReportFilterParams>) => void
  onFilterReset: () => void
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: string | null, order: StyleReportOrder | null) => void
}

function StyleReportTableCardInner({
  data,
  rowCount,
  loading,
  filters,
  onFilterChange,
  onFilterReset,
  onPaginationChange,
  onSortingChange,
}: StyleReportTableCardProps) {
  const columns = useMemo(() => getColumns(), [])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'query',
        label: 'Keyword',
        type: 'input',
        value: filters.query ?? null,
        placeholder: 'Search style/channel/date…',
      },
    ],
    [filters.query],
  )

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )

  const onApplyFilters = useCallback(
    (values: Record<string, unknown>) => {
      onFilterChange({
        query: typeof values.query === 'string' ? values.query : undefined,
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
    enableRowSelection: false,
    initialState: {
      density: 'md',
    },
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 10,
      },
      sorting,
    },
    onPaginationChange: (updater) => {
      const current = {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 10,
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
        <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No report rows found.</p>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const StyleReportTableCard = memo(StyleReportTableCardInner)
