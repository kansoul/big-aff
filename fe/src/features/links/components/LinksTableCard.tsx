import { memo, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  useMantineReactTable,
  type MRT_ColumnDef,
} from 'mantine-react-table'
import { Copy, ExternalLink, Link2, Pencil, Plus, Trash2 } from 'lucide-react'

import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Link, LinkStatus } from '@/features/links/types'
import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { useIsMobile } from '@/hooks/useMobile'
import type { LinkPlatform } from '@/lib/link'

type LinksTableCardProps = {
  data: Link[]
  rowCount: number
  loading: boolean
  page: number
  perPage: number
  keyword: string
  status: LinkStatus | 'all'
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onPaginationChange: (page: number, perPage: number) => void
  onFilterApply: (values: Record<string, unknown>) => void
  onFilterReset: () => void
  onAddClick: () => void
  onEditRow: (link: Link) => void
  onDeleteRow: (link: Link) => void | Promise<void>
  onCopyLink: (link: Link, platform: LinkPlatform) => void | Promise<void>
}

type ColumnMeta = Pick<
  LinksTableCardProps,
  'canUpdate' | 'canDelete' | 'onEditRow' | 'onDeleteRow' | 'onCopyLink'
>

function getColumns(meta: ColumnMeta): MRT_ColumnDef<Link>[] {
  const { canUpdate, canDelete, onEditRow, onDeleteRow, onCopyLink } = meta

  return [
    {
      id: 'copy_links',
      header: 'Copy links',
      size: 170,
      enableSorting: false,
      enableHiding: false,
      Cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          {(['facebook', 'google', 'tiktok'] as const).map((platform) => (
            <Button
              key={platform}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] font-medium"
              onClick={() => void onCopyLink(row.original, platform)}
            >
              <Copy className="size-3" />
              {platform === 'facebook' ? 'FB' : platform === 'google' ? 'GG' : 'TT'}
            </Button>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'id',
      header: 'ID',
      size: 70,
      enableSorting: false,
      Cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">#{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 180,
      enableSorting: false,
      Cell: ({ row }) => (
        <span
          className="block max-w-full truncate font-medium text-foreground"
          title={row.original.name}
        >
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'url',
      header: 'Destination URL',
      size: 320,
      enableSorting: false,
      Cell: ({ row }) => (
        <a
          className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
          href={row.original.url}
          target="_blank"
          rel="noreferrer"
          title={row.original.url}
        >
          <span className="truncate">{row.original.url}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      ),
    },
    {
      accessorKey: 'tracking_code',
      header: 'Tracking code',
      size: 270,
      enableSorting: false,
      Cell: ({ row }) => (
        <span
          className="block max-w-full truncate font-mono text-[11px] text-muted-foreground"
          title={row.original.tracking_code}
        >
          {row.original.tracking_code}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      enableSorting: false,
      Cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
          {row.original.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 90,
      enableSorting: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { width: 90, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      mantineTableBodyCellProps: { style: { width: 90 } },
      Cell: ({ row }) => {
        const link = row.original
        return (
          <TooltipProvider>
            <div
              className="flex items-center justify-end gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {canUpdate ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => onEditRow(link)}
                    >
                      <Pencil className="size-3.5" />
                      <span className="sr-only">Edit {link.name}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Edit
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {canDelete ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void onDeleteRow(link)}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Delete {link.name}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Delete
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </TooltipProvider>
        )
      },
    },
  ]
}

function LinksTableCardInner(props: LinksTableCardProps) {
  const {
    data,
    rowCount,
    loading,
    page,
    perPage,
    keyword,
    status,
    canCreate,
    canUpdate,
    canDelete,
    onPaginationChange,
    onFilterApply,
    onFilterReset,
    onAddClick,
    onEditRow,
    onDeleteRow,
    onCopyLink,
  } = props
  const isMobile = useIsMobile()
  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
  )
  const columns = useMemo(
    () => getColumns({ canUpdate, canDelete, onEditRow, onDeleteRow, onCopyLink }),
    [canDelete, canUpdate, onCopyLink, onDeleteRow, onEditRow],
  )
  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'keyword',
        label: 'Search',
        type: 'input',
        value: keyword || null,
        placeholder: 'Search name or URL…',
      },
      {
        field: 'status',
        label: 'Status',
        type: 'select',
        value: status === 'all' ? null : status,
        placeholder: 'All statuses',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ],
      },
    ],
    [keyword, status],
  )
  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (keyword) chips.push({ key: 'keyword', label: 'Search', displayValue: `“${keyword}”` })
    if (status !== 'all') {
      chips.push({
        key: 'status',
        label: 'Status',
        displayValue: status === 'active' ? 'Active' : 'Inactive',
      })
    }
    return chips
  }, [keyword, status])

  const table = useMantineReactTable({
    data,
    columns,
    getRowId: (row) => String(row.id),
    manualPagination: true,
    rowCount,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    initialState: { density: 'xs' },
    state: {
      showLoadingOverlay: loading,
      pagination: { pageIndex: page - 1, pageSize: perPage },
      columnPinning: { right: isMobile ? [] : ['actions'] },
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize: perPage }
      const next = typeof updater === 'function' ? updater(current) : updater
      onPaginationChange(next.pageIndex + 1, next.pageSize)
    },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    mantineLoadingOverlayProps: {
      sx: { transform: 'translateX(var(--mrt-scroll-left, 0px))' },
    },
    mantineTableContainerProps: {
      onScroll: (event: React.UIEvent<HTMLDivElement>) => {
        event.currentTarget.style.setProperty(
          '--mrt-scroll-left',
          `${event.currentTarget.scrollLeft}px`,
        )
      },
      sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    },
    mantineTableProps: { highlightOnHover: true, withColumnBorders: false },
    mantineTableHeadCellProps: {
      sx: { paddingTop: 10, paddingBottom: 10, fontSize: 12, whiteSpace: 'nowrap' },
    },
    mantineTableBodyCellProps: {
      sx: { paddingTop: 8, paddingBottom: 8, fontSize: 12, verticalAlign: 'middle' },
    },
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: currentTable }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Link2 className="size-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Links</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {rowCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {canCreate ? (
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={onAddClick}
              >
                <Plus className="size-3.5" />
                New link
              </Button>
            ) : null}
            {canCreate ? <div className="h-4 w-px bg-border" /> : null}
            <MRT_ShowHideColumnsButton table={currentTable} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <FilterPanel
            fields={filterFields}
            applyMode
            onApply={onFilterApply}
            onReset={onFilterReset}
          />
        </div>
        <ActiveFilterChips
          chips={activeChips}
          onRemove={(key) =>
            onFilterApply({
              keyword: key === 'keyword' ? null : keyword || null,
              status: key === 'status' ? null : status === 'all' ? null : status,
            })
          }
          onClearAll={onFilterReset}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Link2 className="size-5 text-muted-foreground/50" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No links found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or create a new link.
          </p>
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const LinksTableCard = memo(LinksTableCardInner)
