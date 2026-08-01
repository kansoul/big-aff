import { memo, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { CheckCircle2, Network, Pencil, Plus, Trash2, XCircle } from 'lucide-react'

import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { useIsMobile } from '@/hooks/useMobile'
import type { MainTeam, MainTeamFilterParams } from '@/features/main-teams/types'

type ActionMeta = {
  onEditRow: (row: MainTeam) => void
  onDeleteRow: (row: MainTeam) => void
}

function getColumns({ onEditRow, onDeleteRow }: ActionMeta): MRT_ColumnDef<MainTeam>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      size: 220,
      Cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-full truncate font-medium text-foreground">
                {row.original.name}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs wrap-break-word">
              {row.original.name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 260,
      enableSorting: false,
      Cell: ({ row }) => {
        const description = row.original.description
        if (!description) return <span className="text-muted-foreground/50">-</span>
        return <span className="line-clamp-2 text-muted-foreground">{description}</span>
      },
    },
    {
      accessorKey: 'sync_campaign_reports',
      header: 'Campaign Sync',
      size: 150,
      Cell: ({ row }) =>
        row.original.sync_campaign_reports ? (
          <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600">
            <CheckCircle2 className="size-3" />
            Enabled
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <XCircle className="size-3" />
            Disabled
          </Badge>
        ),
    },
    {
      accessorKey: 'accounts_count',
      header: 'Accounts',
      size: 110,
      Cell: ({ row }) => (
        <span className="font-semibold tabular-nums">
          {(row.original.accounts_count ?? row.original.accounts?.length ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      size: 170,
      Cell: ({ row }) => {
        const createdAt = row.original.created_at
        if (!createdAt) return <span className="text-muted-foreground/50">-</span>
        return <span className="text-muted-foreground">{new Date(createdAt).toLocaleString()}</span>
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 110,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: {
          width: 110,
          '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' },
        },
      },
      mantineTableBodyCellProps: { style: { width: 110 } },
      Cell: ({ row }) => (
        <TooltipProvider>
          <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onEditRow(row.original)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Edit
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDeleteRow(row.original)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Delete
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ]
}

type MainTeamsTableCardProps = {
  data: MainTeam[]
  rowCount: number
  loading: boolean
  filters: MainTeamFilterParams
  onFilterChange: (patch: Partial<MainTeamFilterParams>) => void
  onFilterReset: () => void
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: string | null, order: 'asc' | 'desc' | null) => void
  onAddClick: () => void
  onEditRow: (row: MainTeam) => void
  onDeleteRow: (row: MainTeam) => void
}

function MainTeamsTableCardInner({
  data,
  rowCount,
  loading,
  filters,
  onFilterChange,
  onFilterReset,
  onPaginationChange,
  onSortingChange,
  onAddClick,
  onEditRow,
  onDeleteRow,
}: MainTeamsTableCardProps) {
  const isMobile = useIsMobile()
  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
    { created_at: false },
  )

  const columns = useMemo(() => getColumns({ onEditRow, onDeleteRow }), [onEditRow, onDeleteRow])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'query',
        label: 'Keyword',
        type: 'input',
        value: filters.query ?? null,
        placeholder: 'Search name or description...',
      },
    ],
    [filters.query],
  )

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )

  const activeChips = useMemo<ActiveFilterChip[]>(
    () =>
      filters.query ? [{ key: 'query', label: 'Keyword', displayValue: `"${filters.query}"` }] : [],
    [filters.query],
  )

  const table = useMantineReactTable({
    data,
    columns,
    getRowId: (row) => String(row.id),
    manualPagination: true,
    manualSorting: true,
    rowCount,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    enableRowSelection: false,
    initialState: {
      density: 'md',
    },
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 15,
      },
      sorting,
      columnPinning: { right: isMobile ? [] : ['actions'] },
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const current = {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 15,
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
    mantineLoadingOverlayProps: {
      sx: { transform: 'translateX(var(--mrt-scroll-left, 0px))' },
    },
    mantineTableContainerProps: {
      onScroll: (e: React.UIEvent<HTMLDivElement>) => {
        e.currentTarget.style.setProperty('--mrt-scroll-left', `${e.currentTarget.scrollLeft}px`)
      },
      sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    },
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Network className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Main Teams</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {rowCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs font-medium"
              onClick={onAddClick}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Main Team
            </Button>
            <div className="h-4 w-px bg-border" />
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
          onRemove={() => onFilterChange({ query: null })}
          onClearAll={onFilterReset}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Network className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No main teams found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or add a new main team.
          </p>
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const MainTeamsTableCard = memo(MainTeamsTableCardInner)
