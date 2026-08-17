import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  useMantineReactTable,
} from 'mantine-react-table'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { newCampaignApi } from '@/features/new-campaign/api'
import {
  NEW_CAMPAIGN_TABLE_DEFAULT_PAGE_SIZE,
  NEW_CAMPAIGN_TABLE_PAGE_SIZE_OPTIONS,
} from '@/features/new-campaign/constants'
import type { CampaignRow, OfferListFilters, OfferRow } from '@/features/new-campaign/types'

function parseFilters(params: URLSearchParams, urlScope: string): OfferListFilters {
  return {
    page: Number(params.get(`nc_${urlScope}_offer_page`) ?? 1),
    per_page: Number(
      params.get(`nc_${urlScope}_offer_per_page`) ?? NEW_CAMPAIGN_TABLE_DEFAULT_PAGE_SIZE,
    ),
    search: params.get(`nc_${urlScope}_offer_search`) ?? '',
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function getColumns(showCampaign: boolean): MRT_ColumnDef<OfferRow>[] {
  return [
    { accessorKey: 'offer_name', header: 'Offer name', size: 260 },
    {
      accessorKey: 'offer_id',
      header: 'Offer ID',
      size: 220,
      Cell: ({ row }) => <span className="font-mono text-xs">{row.original.offer_id}</span>,
    },
    ...(showCampaign
      ? [
          {
            accessorKey: 'campaign_name',
            header: 'Campaign name',
            size: 330,
            Cell: ({ row }: { row: { original: OfferRow } }) => (
              <span className="block truncate">{row.original.campaign_name}</span>
            ),
          } satisfies MRT_ColumnDef<OfferRow>,
        ]
      : []),
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
      size: 145,
      Cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {formatCurrency(row.original.revenue)}
        </span>
      ),
      mantineTableHeadCellProps: { align: 'right' },
    },
  ]
}

type CampaignOffersTableProps = {
  campaign?: CampaignRow
  urlScope: string
}

function CampaignOffersTableInner({ campaign, urlScope }: CampaignOffersTableProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<OfferListFilters>(() =>
    parseFilters(searchParams, urlScope),
  )
  const [rows, setRows] = useState<OfferRow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: Math.max(0, filters.page - 1),
    pageSize: filters.per_page,
  })

  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        const values: [string, string | undefined][] = [
          [`nc_${urlScope}_offer_page`, filters.page === 1 ? undefined : String(filters.page)],
          [
            `nc_${urlScope}_offer_per_page`,
            filters.per_page === NEW_CAMPAIGN_TABLE_DEFAULT_PAGE_SIZE
              ? undefined
              : String(filters.per_page),
          ],
          [`nc_${urlScope}_offer_search`, filters.search || undefined],
        ]
        values.forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
        return next.toString() === current.toString() ? current : next
      },
      { replace: true },
    )
  }, [filters, setSearchParams, urlScope])

  const deferredSearch = useDeferredValue(filters.search)
  const requestFilters = useMemo(
    () => ({ page: filters.page, per_page: filters.per_page, search: deferredSearch }),
    [deferredSearch, filters.page, filters.per_page],
  )

  useEffect(() => {
    let cancelled = false
    void newCampaignApi.listOffers(requestFilters, campaign).then((response) => {
      if (cancelled) return
      setRows(response.data)
      setRowCount(response.pagination.total)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [campaign, requestFilters])

  const columns = useMemo(() => getColumns(!campaign), [campaign])
  const onSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true)
    setPagination((current) => ({ ...current, pageIndex: 0 }))
    setFilters((current) => ({ ...current, page: 1, search: event.target.value }))
  }, [])
  const onPaginationChange = useCallback(
    (updater: MRT_PaginationState | ((previous: MRT_PaginationState) => MRT_PaginationState)) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      setLoading(true)
      setPagination(next)
      setFilters((current) => ({ ...current, page: next.pageIndex + 1, per_page: next.pageSize }))
    },
    [pagination],
  )

  const table = useMantineReactTable({
    columns,
    data: rows,
    getRowId: (row) => row.id,
    manualPagination: true,
    rowCount,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableFullScreenToggle: false,
    enableDensityToggle: false,
    paginationDisplayMode: 'pages',
    mantinePaginationProps: {
      rowsPerPageOptions: NEW_CAMPAIGN_TABLE_PAGE_SIZE_OPTIONS,
    },
    state: { pagination, showLoadingOverlay: loading },
    onPaginationChange,
    mantineTableContainerProps: { className: 'overflow-x-auto' },
    renderTopToolbar: () => (
      <div className="flex w-full items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{campaign ? 'Offers' : 'All offers'}</p>
          {campaign ? (
            <p className="max-w-96 truncate text-xs text-muted-foreground">
              {campaign.campaign_name}
            </p>
          ) : null}
        </div>
        <div className="relative w-72 max-w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={onSearchChange}
            className="h-8 pl-8 text-xs"
            placeholder="Search offers..."
            aria-label="Search offers"
          />
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const CampaignOffersTable = memo(CampaignOffersTableInner)
