import { memo, useMemo, type Dispatch, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { Pencil, Plus, Trash2, UsersRound } from 'lucide-react'
import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/useMobile'
import type { UserFilterParams } from '@/features/users/types'
import type { ManagedUser } from '@/shared/types'

type PaginationState = { pageIndex: number; pageSize: number }

type ActionMeta = {
  currentUserId: number | undefined
  canUpdate: boolean
  hasDeletableRows: boolean
  onEditRow: (row: ManagedUser) => void
  onDeleteRow: (row: ManagedUser) => void
}

function getUsersColumns(meta: ActionMeta): MRT_ColumnDef<ManagedUser>[] {
  const { canUpdate, hasDeletableRows, currentUserId, onEditRow, onDeleteRow } = meta

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
      size: 140,
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
      accessorKey: 'email',
      header: 'Email',
      size: 160,
      Cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block text-muted-foreground max-w-full">
                {row.original.email}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs break-all text-xs">
              {row.original.email}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      id: 'role_id',
      header: 'Role',
      size: 110,
      accessorFn: (row) => row.role?.name ?? '',
      Cell: ({ row }) => {
        const roleName = row.original.role?.name
        if (!roleName) return <span className="text-muted-foreground/50">—</span>
        return <StatusBadge status={roleName.toLowerCase()} label={roleName} />
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      size: 160,
      Cell: ({ row }) => {
        const createdAt = row.original.created_at
        if (!createdAt) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(createdAt).toLocaleString()}</span>
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated At',
      size: 160,
      Cell: ({ row }) => {
        const updatedAt = row.original.updated_at
        if (!updatedAt) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(updatedAt).toLocaleString()}</span>
      },
    },
    ...(canUpdate || hasDeletableRows
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
            Cell: ({ row }: { row: { original: ManagedUser } }) => {
              const u = row.original
              return (
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
                            onClick={() => onEditRow(u)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Edit
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    {hasDeletableRows && u.id !== currentUserId ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDeleteRow(u)}
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
              )
            },
          } satisfies MRT_ColumnDef<ManagedUser>,
        ]
      : []),
  ]
}

type SettingsUsersTableCardProps = {
  loading: boolean
  users: ManagedUser[]
  rowCount: number
  pagination: PaginationState
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>
  filters: UserFilterParams
  roles: { id: number; name: string }[]
  onFilterChange: (patch: Partial<UserFilterParams>) => void
  onFilterReset: () => void
  onSortingChange: (sorting: MRT_SortingState) => void
  currentUserId: number | undefined
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onAddClick: () => void
  onEditRow: (row: ManagedUser) => void
  onDeleteRow: (row: ManagedUser) => void
}

function SettingsUsersTableCardInner({
  loading,
  users,
  rowCount,
  pagination,
  onPaginationChange,
  filters,
  roles,
  onFilterChange,
  onFilterReset,
  onSortingChange,
  currentUserId,
  canCreate,
  canUpdate,
  canDelete,
  onAddClick,
  onEditRow,
  onDeleteRow,
}: SettingsUsersTableCardProps) {
  const isMobile = useIsMobile()
  const hasDeletableRows = canDelete && users.some((row) => row.id !== currentUserId)
  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
    {},
  )
  const columns = useMemo(
    () => getUsersColumns({ currentUserId, canUpdate, hasDeletableRows, onEditRow, onDeleteRow }),
    [currentUserId, canUpdate, hasDeletableRows, onEditRow, onDeleteRow],
  )

  const sorting: MRT_SortingState = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )
  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'keyword',
        label: 'Search',
        type: 'input',
        value: filters.keyword ?? null,
        placeholder: 'Search name or email…',
      },
      {
        field: 'role_id',
        label: 'Role',
        type: 'select',
        value: filters.role_id ? String(filters.role_id) : null,
        placeholder: 'All roles',
        options: roles.map((role) => ({ label: role.name, value: String(role.id) })),
      },
    ],
    [filters.keyword, filters.role_id, roles],
  )
  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (filters.keyword) {
      chips.push({ key: 'keyword', label: 'Search', displayValue: `“${filters.keyword}”` })
    }
    if (filters.role_id) {
      chips.push({
        key: 'role_id',
        label: 'Role',
        displayValue:
          roles.find((role) => role.id === filters.role_id)?.name ?? String(filters.role_id),
      })
    }
    return chips
  }, [filters.keyword, filters.role_id, roles])

  const handleApply = (values: Record<string, unknown>) => {
    onFilterChange({
      keyword: typeof values.keyword === 'string' ? values.keyword : null,
      role_id: values.role_id ? Number(values.role_id) : null,
    })
  }

  const table = useMantineReactTable({
    data: users,
    columns,
    getRowId: (row) => String(row.id),
    manualPagination: true,
    manualSorting: true,
    rowCount,
    onPaginationChange,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      onSortingChange(next)
    },
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    initialState: {
      density: 'xs',
    },
    state: {
      pagination,
      sorting,
      showLoadingOverlay: loading,
      columnPinning: { right: isMobile ? [] : ['actions'] },
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
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
        onEditRow(row.original)
      },
      sx: { cursor: 'pointer' },
    }),
    localization: {
      rowsPerPage: 'Per Page',
    },
    renderTopToolbar: ({ table: currentTable }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <UsersRound className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Users</span>
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
                Add User
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
            onApply={handleApply}
            onReset={onFilterReset}
          />
        </div>
        <ActiveFilterChips
          chips={activeChips}
          onRemove={(key) => onFilterChange({ [key]: null })}
          onClearAll={onFilterReset}
        />
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const SettingsUsersTableCard = memo(SettingsUsersTableCardInner)
