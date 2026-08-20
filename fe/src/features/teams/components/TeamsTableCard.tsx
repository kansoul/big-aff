import { memo, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { Loader2, Network, Pencil, Plus, Trash2, UserPlus, UsersRound } from 'lucide-react'

import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/useMobile'
import type { Team, TeamFilterParams, TeamRole } from '@/features/teams/types'

type ActionMeta = {
  canUpdate: boolean
  canDelete: boolean
  canAssign: boolean
  onEditRow: (row: Team) => void
  onDeleteRow: (row: Team) => void
  onAddMembers: (row: Team) => void
  onEditMembers: (row: Team) => void
  onAssignToLeaders: (row: Team) => void
  savedUserIdsByTeam: Record<number, number[]>
  savedUserRolesByTeam: Record<number, Record<number, TeamRole>>
  teamOptionsLoading: Record<number, boolean>
}

function getColumns(meta: ActionMeta): MRT_ColumnDef<Team>[] {
  const {
    canUpdate,
    canDelete,
    canAssign,
    onEditRow,
    onDeleteRow,
    onAddMembers,
    onEditMembers,
    onAssignToLeaders,
    savedUserIdsByTeam,
    savedUserRolesByTeam,
    teamOptionsLoading,
  } = meta

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
      size: 200,
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
      accessorKey: 'description',
      header: 'Description',
      size: 240,
      enableSorting: false,
      Cell: ({ row }) => {
        const description = row.original.description
        if (!description) return <span className="text-muted-foreground/50">-</span>
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="line-clamp-2 text-muted-foreground cursor-default">
                  {description}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {description}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      id: 'users',
      header: 'Members',
      size: 260,
      enableSorting: false,
      enableGlobalFilter: false,
      Cell: ({ row }) => {
        const team = row.original
        const savedIds = savedUserIdsByTeam[team.id] ?? (team.users ?? []).map((u) => u.id)
        const savedRoles = savedUserRolesByTeam[team.id] ?? {}
        const roleCounts = savedIds.reduce(
          (acc, userId) => {
            const role = savedRoles[userId] ?? 'member'
            acc[role] += 1
            return acc
          },
          { manager: 0, leader: 0, member: 0 },
        )
        const isEmpty = savedIds.length === 0
        const optionsLoading = teamOptionsLoading[team.id] ?? false

        return (
          <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {(team.users_count ?? savedIds.length) > 0 ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {team.users_count ?? savedIds.length} total
                </span>
              ) : null}
              {roleCounts.manager > 0 ? (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  Manager {roleCounts.manager}
                </span>
              ) : null}
              {roleCounts.leader > 0 ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  Leader {roleCounts.leader}
                </span>
              ) : null}
              {roleCounts.member > 0 ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Member {roleCounts.member}
                </span>
              ) : null}
              {optionsLoading ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                </span>
              ) : null}
            </div>
            {canAssign ? (
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={isEmpty ? 'default' : 'secondary'}
                  className="h-7 gap-1 px-2 text-xs font-medium"
                  onClick={() => (isEmpty ? onAddMembers(team) : onEditMembers(team))}
                >
                  {isEmpty ? <UserPlus className="size-3" /> : <Pencil className="size-3" />}
                  {isEmpty ? 'Add members' : 'Edit members'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs font-medium"
                  onClick={() => onAssignToLeaders(team)}
                >
                  <Network className="size-3" />
                  Assign to leaders
                </Button>
              </div>
            ) : null}
          </div>
        )
      },
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
    ...(canUpdate || canDelete
      ? [
          {
            id: 'actions',
            header: 'Actions',
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
            Cell: ({ row }: { row: { original: Team } }) => (
              <TooltipProvider>
                <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {canUpdate ? (
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
                  ) : null}
                  {canDelete ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteRow(row.original)}
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
          } satisfies MRT_ColumnDef<Team>,
        ]
      : []),
  ]
}

type TeamsTableCardProps = {
  data: Team[]
  rowCount: number
  loading: boolean
  filters: TeamFilterParams
  onFilterChange: (patch: Partial<TeamFilterParams>) => void
  onFilterReset: () => void
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: string | null, order: 'asc' | 'desc' | null) => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canAssign: boolean
  onAddClick: () => void
  onEditRow: (row: Team) => void
  onDeleteRow: (row: Team) => void
  onAddMembers: (row: Team) => void
  onEditMembers: (row: Team) => void
  onAssignToLeaders: (row: Team) => void
  savedUserIdsByTeam: Record<number, number[]>
  savedUserRolesByTeam: Record<number, Record<number, TeamRole>>
  teamOptionsLoading: Record<number, boolean>
}

function TeamsTableCardInner({
  data,
  rowCount,
  loading,
  filters,
  onFilterChange,
  onFilterReset,
  onPaginationChange,
  onSortingChange,
  canCreate,
  canUpdate,
  canDelete,
  canAssign,
  onAddClick,
  onEditRow,
  onDeleteRow,
  onAddMembers,
  onEditMembers,
  onAssignToLeaders,
  savedUserIdsByTeam,
  savedUserRolesByTeam,
  teamOptionsLoading,
}: TeamsTableCardProps) {
  const isMobile = useIsMobile()
  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
    { created_at: false },
  )
  const columns = useMemo(
    () =>
      getColumns({
        canUpdate,
        canDelete,
        canAssign,
        onEditRow,
        onDeleteRow,
        onAddMembers,
        onEditMembers,
        onAssignToLeaders,
        savedUserIdsByTeam,
        savedUserRolesByTeam,
        teamOptionsLoading,
      }),
    [
      canUpdate,
      canDelete,
      canAssign,
      onEditRow,
      onDeleteRow,
      onAddMembers,
      onEditMembers,
      onAssignToLeaders,
      savedUserIdsByTeam,
      savedUserRolesByTeam,
      teamOptionsLoading,
    ],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'query',
        label: 'Keyword',
        type: 'input',
        value: filters.query ?? null,
        placeholder: 'Search team name...',
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
    initialState: {
      density: 'xs',
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
            <UsersRound className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Teams</span>
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
                <Plus className="h-3.5 w-3.5" />
                Add Team
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
          onRemove={() => onFilterChange({ query: null })}
          onClearAll={onFilterReset}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <UsersRound className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No teams found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or add a new team.
          </p>
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const TeamsTableCard = memo(TeamsTableCardInner)
