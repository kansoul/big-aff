import { memo, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { Globe, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'

import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useIsMobile } from '@/hooks/useMobile'
import type { Site, SiteFilterParams } from '@/features/sites/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type PaginationState = { pageIndex: number; pageSize: number }

type ActionMeta = {
  canUpdate: boolean
  canDelete: boolean
  canAssign: boolean
  onView: (site: Site) => void
  onEdit: (site: Site) => void
  onDelete: (site: Site) => void
  onAssign: (site: Site) => void
}

const SITE_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Suspended', value: 'suspended' },
] as const

function getSitesColumns(meta: ActionMeta): MRT_ColumnDef<Site>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 65,
      Cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">#{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 180,
      Cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block font-medium text-foreground max-w-full">
                {row.original.name}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
              {row.original.name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'url',
      header: 'URL',
      size: 220,
      Cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={row.original.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80 truncate block max-w-fit"
              >
                {row.original.url}
              </a>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-fit break-all text-xs">
              {row.original.url}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 130,
      Cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      size: 150,
      Cell: ({ row }) => {
        const d = row.original.created_at
        if (!d) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(d).toLocaleString()}</span>
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      size: 150,
      Cell: ({ row }) => {
        const d = row.original.updated_at
        if (!d) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(d).toLocaleString()}</span>
      },
    },
    ...(meta.canUpdate || meta.canDelete || meta.canAssign
      ? [
          {
            id: 'actions',
            header: 'Action',
            size: 148,
            enableSorting: false,
            enableGlobalFilter: false,
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: {
                width: 148,
                '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' },
              },
            },
            mantineTableBodyCellProps: { style: { width: 148 } },
            Cell: ({ row }: { row: { original: Site } }) => (
              <TooltipProvider>
                <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {meta.canAssign ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => meta.onAssign(row.original)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Assign
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {meta.canUpdate ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => meta.onEdit(row.original)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Edit
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {meta.canDelete ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => meta.onDelete(row.original)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Delete
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              </TooltipProvider>
            ),
          } satisfies MRT_ColumnDef<Site>,
        ]
      : []),
  ]
}

type SitesTableCardProps = {
  data: Site[]
  rowCount: number
  loading: boolean
  pagination: PaginationState
  onPaginationChange: (pagination: PaginationState) => void
  filters: SiteFilterParams
  onFilterChange: (patch: Partial<SiteFilterParams>) => void
  onFilterReset: () => void
  onSortingChange: (sorting: MRT_SortingState) => void
  canCreate: boolean
  onCreateClick: () => void
  canAssign: boolean
  onAssignClick: (site: Site) => void
  canUpdate: boolean
  onViewClick: (site: Site) => void
  onEditClick: (site: Site) => void
  canDelete: boolean
  onDeleteClick: (site: Site) => void
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
}

function SitesTableCardInner({
  data,
  rowCount,
  loading,
  pagination,
  onPaginationChange,
  filters,
  onFilterChange,
  onFilterReset,
  onSortingChange,
  canCreate,
  onCreateClick,
  canAssign,
  onAssignClick,
  canUpdate,
  onViewClick,
  onEditClick,
  canDelete,
  onDeleteClick,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
}: SitesTableCardProps) {
  const isMobile = useIsMobile()
  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
    { updated_at: false },
  )
  const columns = useMemo(
    () =>
      getSitesColumns({
        canAssign,
        canUpdate,
        canDelete,
        onView: onViewClick,
        onEdit: onEditClick,
        onDelete: onDeleteClick,
        onAssign: onAssignClick,
      }),
    [canAssign, canUpdate, canDelete, onViewClick, onEditClick, onDeleteClick, onAssignClick],
  )

  const sorting: MRT_SortingState = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )
  const rowSelection = useMemo<MRT_RowSelectionState>(
    () => Object.fromEntries(data.map((row) => [String(row.id), selectedIds.has(row.id)])),
    [data, selectedIds],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'keyword',
        label: 'Keyword',
        type: 'input',
        value: filters.keyword ?? null,
        placeholder: 'Search by name or URL…',
      },
      {
        field: 'status',
        label: 'Status',
        type: 'select',
        value: filters.status ?? null,
        options: [...SITE_STATUS_OPTIONS],
      },
    ],
    [filters],
  )

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []

    if (filters.keyword) {
      chips.push({ key: 'keyword', label: 'Keyword', displayValue: `"${filters.keyword}"` })
    }
    if (filters.status) {
      const opt = SITE_STATUS_OPTIONS.find((option) => option.value === filters.status)
      chips.push({
        key: 'status',
        label: 'Status',
        displayValue: opt?.label ?? filters.status,
      })
    }

    return chips
  }, [filters.keyword, filters.status])

  function handleRemoveChip(key: string) {
    onFilterChange({ [key]: null } as Partial<SiteFilterParams>)
  }

  const table = useMantineReactTable({
    data,
    columns,
    getRowId: (row) => String(row.id),
    manualPagination: true,
    manualSorting: true,
    rowCount,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      onPaginationChange(next)
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      onSortingChange(next)
    },
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    enableRowSelection: canDelete,
    initialState: {
      density: 'md',
    },
    state: {
      pagination,
      sorting,
      showLoadingOverlay: loading,
      rowSelection,
      columnPinning: { right: isMobile ? [] : ['actions'] },
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newPageSelection: MRT_RowSelectionState =
        typeof updater === 'function' ? updater(rowSelection) : updater
      onSelectionChange((prev) => {
        const next = new Set(prev)
        for (const row of data) next.delete(row.id)
        for (const [idStr, checked] of Object.entries(newPageSelection)) {
          if (checked) next.add(Number(idStr))
        }
        return next
      })
    },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineLoadingOverlayProps: {
      sx: { transform: 'translateX(var(--mrt-scroll-left, 0px))' },
    },
    mantineTableContainerProps: {
      onScroll: (e: React.UIEvent<HTMLDivElement>) => {
        e.currentTarget.style.setProperty('--mrt-scroll-left', `${e.currentTarget.scrollLeft}px`)
      },
      sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: (event) => {
        const target = event.target as HTMLElement
        if (target.closest('button,input,a,[role="checkbox"]')) return
        onViewClick(row.original)
      },
      sx: { cursor: 'pointer' },
    }),
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">Sites</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {rowCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {canDelete && selectedIds.size > 0 ? (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 gap-1.5 px-2.5 text-xs font-semibold"
                  onClick={onBulkDeleteClick}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete {selectedIds.size} selected
                </Button>
                <div className="h-4 w-px bg-border" />
              </>
            ) : null}
            {canCreate ? (
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={onCreateClick}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Site
              </Button>
            ) : null}
            {canCreate && <div className="h-4 w-px bg-border" />}
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <FilterPanel
            fields={filterFields}
            onReset={onFilterReset}
            applyMode
            onApply={onFilterChange}
          />
        </div>
        <ActiveFilterChips
          chips={activeChips}
          onRemove={handleRemoveChip}
          onClearAll={onFilterReset}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Globe className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No sites found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or add a new site.
          </p>
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const SitesTableCard = memo(SitesTableCardInner)
