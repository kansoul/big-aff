import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  useMantineReactTable,
} from 'mantine-react-table'
import { Loader2, Network, Pencil, Plus, Trash2, UserPlus, UsersRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
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
      accessorKey: 'name',
      header: 'Name',
      size: 200,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 240,
      enableSorting: false,
      Cell: ({ row }) => {
        const description = row.original.description
        if (!description) return <span className="text-muted-foreground/50">-</span>
        return <span className="line-clamp-2 text-muted-foreground">{description}</span>
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
                  variant="outline"
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
    {
      id: 'actions',
      header: 'Actions',
      size: 140,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { width: 140, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      mantineTableBodyCellProps: { style: { width: 140 } },
      Cell: ({ row }: { row: { original: Team } }) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-label={`Edit ${row.original.name}`}
              onClick={() => onEditRow(row.original)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${row.original.name}`}
              onClick={() => onDeleteRow(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
      ),
    } satisfies MRT_ColumnDef<Team>,
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
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
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
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
}: TeamsTableCardProps) {
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
  const rowSelection = useMemo<MRT_RowSelectionState>(
    () => Object.fromEntries(data.map((row) => [String(row.id), selectedIds.has(row.id)])),
    [data, selectedIds],
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
    enableColumnPinning: true,
    enableRowSelection: canDelete,
    initialState: {
      density: 'md',
      columnVisibility: { created_at: false },
      columnPinning: { right: ['actions'] },
    },
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 15,
      },
      sorting,
      rowSelection,
    },
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
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col gap-4 rounded-md border bg-muted/20 p-4">
        <div className="flex w-full items-center justify-end gap-2">
          {canDelete && selectedIds.size > 0 ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
                onClick={onBulkDeleteClick}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete ({selectedIds.size})
              </Button>
              <div className="mx-1 h-5 w-px bg-border" />
            </>
          ) : null}
          {canCreate ? (
            <>
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
                onClick={onAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Team
              </Button>
              <div className="mx-1 h-5 w-px bg-border" />
            </>
          ) : null}
          <MRT_ShowHideColumnsButton table={t} />
        </div>
        <FilterPanel
          fields={filterFields}
          onReset={onFilterReset}
          applyMode
          onApply={onFilterChange}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <UsersRound className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No teams found.</p>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const TeamsTableCard = memo(TeamsTableCardInner)
