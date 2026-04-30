import { memo, useMemo, type Dispatch, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
} from 'mantine-react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
  onSortingChange: (sorting: MRT_SortingState) => void
  currentUserId: number | undefined
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onAddClick: () => void
  onEditRow: (row: ManagedUser) => void
  onDeleteRow: (row: ManagedUser) => void
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
}

function SettingsUsersTableCardInner({
  loading,
  users,
  rowCount,
  pagination,
  onPaginationChange,
  filters,
  onSortingChange,
  currentUserId,
  canCreate,
  canUpdate,
  canDelete,
  onAddClick,
  onEditRow,
  onDeleteRow,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
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
  const rowSelection = useMemo<MRT_RowSelectionState>(
    () => Object.fromEntries(users.map((row) => [String(row.id), selectedIds.has(row.id)])),
    [users, selectedIds],
  )

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
    enableColumnFilters: true,
    enableGlobalFilter: true,
    positionGlobalFilter: 'left',
    enableColumnPinning: !isMobile,
    enableRowSelection: (row) => canDelete && row.original.id !== currentUserId,
    mantineSearchTextInputProps: {
      placeholder: 'Search…',
      sx: { minWidth: 'clamp(120px, 40vw, 260px)' },
    },
    initialState: {
      showGlobalFilter: true,
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
        for (const row of users) next.delete(row.id)
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
        onEditRow(row.original)
      },
      sx: { cursor: 'pointer' },
    }),
    localization: {
      rowsPerPage: 'Per Page',
    },
    renderToolbarInternalActions: ({ table: t }) => (
      <div className="flex items-center gap-1">
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
          <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs font-medium" onClick={onAddClick}>
            <Plus className="h-3.5 w-3.5" />
            Add User
          </Button>
        ) : null}
        {canCreate && <div className="h-4 w-px bg-border" />}
        <MRT_ToggleGlobalFilterButton table={t} />
        <MRT_ShowHideColumnsButton table={t} />
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const SettingsUsersTableCard = memo(SettingsUsersTableCardInner)
