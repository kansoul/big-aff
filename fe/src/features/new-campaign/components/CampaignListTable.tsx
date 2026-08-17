import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_RowSelectionState,
  type MRT_SortingState,
  useMantineReactTable,
} from 'mantine-react-table'
import { ExternalLink, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { newCampaignApi } from '@/features/new-campaign/api'
import { useCampaignWorkspaceActions } from '@/features/new-campaign/components/CampaignWorkspaceProvider'
import {
  NEW_CAMPAIGN_TABLE_DEFAULT_PAGE_SIZE,
  NEW_CAMPAIGN_TABLE_PAGE_SIZE_OPTIONS,
} from '@/features/new-campaign/constants'
import type { CampaignListFilters, CampaignRow } from '@/features/new-campaign/types'

function parseFilters(params: URLSearchParams): CampaignListFilters {
  return {
    page: Number(params.get('nc_home_campaign_page') ?? 1),
    per_page: Number(
      params.get('nc_home_campaign_per_page') ?? NEW_CAMPAIGN_TABLE_DEFAULT_PAGE_SIZE,
    ),
    search: params.get('nc_home_campaign_search') ?? '',
    order_by: (params.get('nc_home_campaign_order_by') as keyof CampaignRow | null) ?? undefined,
    order: (params.get('nc_home_campaign_order') as 'asc' | 'desc' | null) ?? undefined,
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function getColumns(onOpenCampaign: (campaign: CampaignRow) => void): MRT_ColumnDef<CampaignRow>[] {
  return [
    {
      accessorKey: 'campaign_name',
      header: 'Campaign name',
      size: 360,
      Cell: ({ row }) => (
        <button
          type="button"
          className="block w-full truncate text-left font-medium text-foreground hover:text-primary"
          title="Double click to open report"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => {
            event.stopPropagation()
            onOpenCampaign(row.original)
          }}
        >
          {row.original.campaign_name}
        </button>
      ),
    },
    {
      accessorKey: 'campaign_id',
      header: 'Campaign ID',
      size: 250,
      Cell: ({ row }) => (
        <span className="block truncate font-mono text-xs">{row.original.campaign_id}</span>
      ),
    },
    {
      accessorKey: 'external_campaign_id',
      header: 'External campaign ID',
      size: 260,
      Cell: ({ row }) => (
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {row.original.external_campaign_id ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'conversions',
      header: 'Conversions',
      size: 130,
      Cell: ({ row }) => (
        <span className="block text-right tabular-nums">{row.original.conversions}</span>
      ),
      mantineTableHeadCellProps: { align: 'right' },
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      size: 150,
      Cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {formatCurrency(row.original.revenue)}
        </span>
      ),
      mantineTableHeadCellProps: { align: 'right' },
    },
    {
      accessorKey: 'ctr',
      header: 'CTR',
      size: 110,
      Cell: ({ row }) => (
        <span className="block text-right tabular-nums">{row.original.ctr.toFixed(2)}%</span>
      ),
      mantineTableHeadCellProps: { align: 'right' },
    },
  ]
}

function CampaignListTableInner() {
  const { openCampaign, openCampaigns } = useCampaignWorkspaceActions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<CampaignListFilters>(() => parseFilters(searchParams))
  const [rows, setRows] = useState<CampaignRow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({})
  const [sorting, setSorting] = useState<MRT_SortingState>(() =>
    filters.order_by && filters.order
      ? [{ id: filters.order_by, desc: filters.order === 'desc' }]
      : [],
  )
  const [pagination, setPagination] = useState<MRT_PaginationState>(() => ({
    pageIndex: Math.max(0, filters.page - 1),
    pageSize: filters.per_page,
  }))

  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        const values: [string, string | undefined][] = [
          ['nc_home_campaign_page', filters.page === 1 ? undefined : String(filters.page)],
          [
            'nc_home_campaign_per_page',
            filters.per_page === NEW_CAMPAIGN_TABLE_DEFAULT_PAGE_SIZE
              ? undefined
              : String(filters.per_page),
          ],
          ['nc_home_campaign_search', filters.search || undefined],
          ['nc_home_campaign_order_by', filters.order_by],
          ['nc_home_campaign_order', filters.order],
        ]
        values.forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
        return next.toString() === current.toString() ? current : next
      },
      { replace: true },
    )
  }, [filters, setSearchParams])

  const deferredSearch = useDeferredValue(filters.search)
  const requestFilters = useMemo(
    () => ({
      page: filters.page,
      per_page: filters.per_page,
      search: deferredSearch,
      order_by: filters.order_by,
      order: filters.order,
    }),
    [deferredSearch, filters.order, filters.order_by, filters.page, filters.per_page],
  )

  useEffect(() => {
    let cancelled = false
    void newCampaignApi
      .listCampaigns(requestFilters)
      .then((response) => {
        if (cancelled) return
        setRows(response.data)
        setRowCount(response.pagination.total)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [requestFilters])

  const columns = useMemo(() => getColumns(openCampaign), [openCampaign])
  const selectedCampaigns = useMemo(
    () => rows.filter((row) => rowSelection[row.campaign_id]),
    [rows, rowSelection],
  )

  const onSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const search = event.target.value
    setLoading(true)
    setPagination((current) => ({ ...current, pageIndex: 0 }))
    setFilters((current) => ({ ...current, search, page: 1 }))
    setRowSelection({})
  }, [])

  const onPaginationChange = useCallback(
    (updater: MRT_PaginationState | ((previous: MRT_PaginationState) => MRT_PaginationState)) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      setLoading(true)
      setPagination(next)
      setFilters((current) => ({ ...current, page: next.pageIndex + 1, per_page: next.pageSize }))
      setRowSelection({})
    },
    [pagination],
  )

  const onSortingChange = useCallback(
    (updater: MRT_SortingState | ((previous: MRT_SortingState) => MRT_SortingState)) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const sort = next[0]
      setLoading(true)
      setSorting(next)
      setPagination((current) => ({ ...current, pageIndex: 0 }))
      setFilters((current) => ({
        ...current,
        page: 1,
        order_by: sort?.id as keyof CampaignRow | undefined,
        order: sort ? (sort.desc ? 'desc' : 'asc') : undefined,
      }))
    },
    [sorting],
  )

  const table = useMantineReactTable({
    columns,
    data: rows,
    getRowId: (row) => row.campaign_id,
    manualPagination: true,
    manualSorting: true,
    rowCount,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: false,
    enableRowSelection: true,
    enableFullScreenToggle: false,
    enableDensityToggle: false,
    paginationDisplayMode: 'pages',
    mantinePaginationProps: {
      rowsPerPageOptions: NEW_CAMPAIGN_TABLE_PAGE_SIZE_OPTIONS,
    },
    state: { pagination, rowSelection, showLoadingOverlay: loading, sorting },
    onPaginationChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange,
    mantineTableContainerProps: { className: 'overflow-x-auto' },
    renderTopToolbar: () => (
      <div className="flex w-full flex-col gap-3 border-b border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Campaigns</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {rowCount}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={onSearchChange}
              className="h-8 pl-8 text-xs"
              placeholder="Search campaign or ID..."
              aria-label="Search campaigns"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={selectedCampaigns.length === 0}
            onClick={() => openCampaigns(selectedCampaigns)}
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Report in new tab
          </Button>
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const CampaignListTable = memo(CampaignListTableInner)
