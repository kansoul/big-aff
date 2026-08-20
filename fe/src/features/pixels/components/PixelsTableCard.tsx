import { memo, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'

import { ActiveFilterChips } from '@/components/common/ActiveFilterChips'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  Pixel,
  PixelBusinessCenterOption,
  PixelPlatform,
  PixelStatus,
} from '@/features/pixels/types'
import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { useIsMobile } from '@/hooks/useMobile'

type Props = {
  pixels: Pixel[]
  rowCount: number
  loading: boolean
  keyword: string | null
  platform: PixelPlatform | null
  businessCenterId: number | null
  status: PixelStatus | null
  businessCenters: PixelBusinessCenterOption[]
  pageIndex: number
  pageSize: number
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onFilterChange: (filters: {
    keyword: string | null
    platform: PixelPlatform | null
    businessCenterId: number | null
    status: PixelStatus | null
  }) => void
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onAddClick: () => void
  onEditRow: (pixel: Pixel) => void
  onDeleteRow: (pixel: Pixel) => void
}

function PixelsTableCardInner(props: Props) {
  const isMobile = useIsMobile()
  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
    { created_at: false },
  )
  const columns = useMemo<MRT_ColumnDef<Pixel>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 70,
        Cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground">#{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'platform',
        header: 'Platform',
        size: 110,
        Cell: ({ row }) => (
          <StatusBadge status={row.original.platform} label={row.original.platform} />
        ),
      },
      {
        accessorKey: 'business_center_id',
        header: 'Business Center',
        size: 220,
        Cell: ({ row }) =>
          row.original.business_center ? (
            <div className="flex flex-col">
              <span className="font-medium">{row.original.business_center.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {row.original.business_center.bc_id}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground/50">—</span>
          ),
      },
      {
        accessorKey: 'pixel_id',
        header: 'Pixel ID',
        size: 220,
        Cell: ({ row }) => <span className="font-mono font-medium">{row.original.pixel_id}</span>,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 260,
        Cell: ({ row }) =>
          row.original.name ? (
            <span className="font-medium">{row.original.name}</span>
          ) : (
            <span className="text-muted-foreground/50">—</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 100,
        Cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'created_at',
        header: 'Created At',
        size: 170,
        Cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.created_at ? new Date(row.original.created_at).toLocaleString() : '—'}
          </span>
        ),
      },
      ...(props.canUpdate || props.canDelete
        ? [
            {
              id: 'actions',
              header: 'Actions',
              size: 90,
              enableSorting: false,
              enableHiding: false,
              mantineTableHeadCellProps: {
                sx: { '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
              },
              Cell: ({ row }: { row: { original: Pixel } }) => (
                <TooltipProvider>
                  <div className="flex justify-end gap-0.5">
                    {props.canUpdate ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => props.onEditRow(row.original)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    ) : null}
                    {props.canDelete ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => props.onDeleteRow(row.original)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </TooltipProvider>
              ),
            } satisfies MRT_ColumnDef<Pixel>,
          ]
        : []),
    ],
    [props],
  )
  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'keyword',
        label: 'Search',
        type: 'input',
        value: props.keyword,
        placeholder: 'Search pixel ID or name…',
      },
      {
        field: 'platform',
        label: 'Platform',
        type: 'select',
        value: props.platform,
        placeholder: 'All platforms',
        options: [
          { label: 'Facebook', value: 'facebook' },
          { label: 'TikTok', value: 'tiktok' },
        ],
      },
      {
        field: 'business_center_id',
        label: 'Business Center',
        type: 'select',
        value: props.businessCenterId ? String(props.businessCenterId) : null,
        placeholder: 'All Business Centers',
        options: props.businessCenters
          .filter((option) => !props.platform || option.ads_type === props.platform)
          .map((option) => ({ label: option.name, value: String(option.id) })),
      },
      {
        field: 'status',
        label: 'Status',
        type: 'select',
        value: props.status,
        placeholder: 'All statuses',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ],
      },
    ],
    [props.businessCenterId, props.businessCenters, props.keyword, props.platform, props.status],
  )
  const clearFilters = () =>
    props.onFilterChange({
      keyword: null,
      platform: null,
      businessCenterId: null,
      status: null,
    })
  const table = useMantineReactTable({
    data: props.pixels,
    columns,
    getRowId: (row) => String(row.id),
    manualPagination: true,
    rowCount: props.rowCount,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    enableFullScreenToggle: false,
    initialState: { density: 'xs' },
    state: {
      pagination: { pageIndex: props.pageIndex, pageSize: props.pageSize },
      showLoadingOverlay: props.loading,
      columnVisibility,
      columnPinning: { right: isMobile ? [] : ['actions'] },
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const current = { pageIndex: props.pageIndex, pageSize: props.pageSize }
      const next = typeof updater === 'function' ? updater(current) : updater
      props.onPaginationChange(next.pageIndex, next.pageSize)
    },
    paginationDisplayMode: 'pages',
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: currentTable }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold">Pixel Conversions</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {props.rowCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {props.canCreate ? (
              <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs" onClick={props.onAddClick}>
                <Plus className="h-3.5 w-3.5" /> New Pixel Conversion
              </Button>
            ) : null}
            {props.canCreate ? <div className="h-4 w-px bg-border" /> : null}
            <MRT_ShowHideColumnsButton table={currentTable} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <FilterPanel
            fields={filterFields}
            applyMode
            onApply={(values) => {
              const value = typeof values.keyword === 'string' ? values.keyword.trim() : ''
              props.onFilterChange({
                keyword: value || null,
                platform: (values.platform as PixelPlatform) || null,
                businessCenterId: values.business_center_id
                  ? Number(values.business_center_id)
                  : null,
                status: (values.status as PixelStatus) || null,
              })
            }}
            onReset={clearFilters}
          />
        </div>
        <ActiveFilterChips
          chips={[
            ...(props.keyword
              ? [{ key: 'keyword', label: 'Search', displayValue: `“${props.keyword}”` }]
              : []),
            ...(props.platform
              ? [{ key: 'platform', label: 'Platform', displayValue: props.platform }]
              : []),
            ...(props.businessCenterId
              ? [
                  {
                    key: 'businessCenterId',
                    label: 'Business Center',
                    displayValue:
                      props.businessCenters.find((item) => item.id === props.businessCenterId)
                        ?.name ?? String(props.businessCenterId),
                  },
                ]
              : []),
            ...(props.status
              ? [{ key: 'status', label: 'Status', displayValue: props.status }]
              : []),
          ]}
          onRemove={(key) =>
            props.onFilterChange({
              keyword: key === 'keyword' ? null : props.keyword,
              platform: key === 'platform' ? null : props.platform,
              businessCenterId: key === 'businessCenterId' ? null : props.businessCenterId,
              status: key === 'status' ? null : props.status,
            })
          }
          onClearAll={clearFilters}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Tag className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium">No Pixel Conversions found</p>
        <p className="text-xs text-muted-foreground">
          Try adjusting your search or add a new Pixel Conversion.
        </p>
      </div>
    ),
  })
  return <MantineReactTable table={table} />
}

export const PixelsTableCard = memo(PixelsTableCardInner)
