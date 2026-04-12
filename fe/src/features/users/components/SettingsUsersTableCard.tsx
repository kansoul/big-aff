import { memo, useMemo, type Dispatch, type SetStateAction } from 'react'
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

import { Button } from '@/components/ui/button'
import type { UserFilterParams } from '@/features/users/types'
import type { ManagedUser } from '@/shared/types'

type PaginationState = { pageIndex: number; pageSize: number }

type ActionMeta = {
  currentUserId: number | undefined
  canUpdate: boolean
  canDelete: boolean
  onEditRow: (row: ManagedUser) => void
  onDeleteRow: (row: ManagedUser) => void
}

function getUsersColumns(meta: ActionMeta): MRT_ColumnDef<ManagedUser>[] {
  const { canUpdate, canDelete, currentUserId, onEditRow, onDeleteRow } = meta

  return [
    {
      accessorKey: 'name',
      header: 'Name',
      size: 140,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      size: 160,
      Cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      size: 140,
      enableSorting: false,
      Cell: ({ row }) => {
        const name = row.original.role?.name
        if (!name) return <span className="text-muted-foreground/50">—</span>
        return (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
            {name}
          </span>
        )
      },
    },
    {
      accessorKey: 'parent',
      header: 'Parent',
      size: 160,
      enableSorting: false,
      Cell: ({ row }) => {
        const name = row.original.parent?.name
        return <span className="text-muted-foreground">{name ?? '—'}</span>
      },
    },
    ...(canUpdate || canDelete
      ? [
          {
            id: 'actions',
            header: 'Actions',
            size: 80,
            enableSorting: false,
            enableGlobalFilter: false,
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: {
                width: 200,
                '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' },
              },
            },
            mantineTableBodyCellProps: { style: { width: 200 } },
            Cell: ({ row }: { row: { original: ManagedUser } }) => {
              const u = row.original
              return (
                <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {canUpdate ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                      aria-label={`Edit ${u.name}`}
                      onClick={() => onEditRow(u)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  ) : null}
                  {canDelete && u.id !== currentUserId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${u.name}`}
                      onClick={() => onDeleteRow(u)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  ) : null}
                </div>
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
  const columns = useMemo(
    () => getUsersColumns({ currentUserId, canUpdate, canDelete, onEditRow, onDeleteRow }),
    [currentUserId, canUpdate, canDelete, onEditRow, onDeleteRow],
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
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: true,
    enableRowSelection: (row) => canDelete && row.original.id !== currentUserId,
    initialState: {
      density: 'md',
      columnVisibility: { parent: false, role: false },
      columnPinning: { right: ['actions'] },
    },
    state: { pagination, sorting, showLoadingOverlay: loading, rowSelection },
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
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
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
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
            onClick={onAddClick}
          >
            <Plus className="h-3.5 w-3.5" />
            Add User
          </Button>
        ) : null}
        <div className="mx-1 h-5 w-px bg-border" />
        <MRT_ToggleGlobalFilterButton table={t} />
        <MRT_ShowHideColumnsButton table={t} />
      </div>
    ),
    renderEmptyRowsFallback: () => null,
  })

  return (
    <>
      <MantineReactTable table={table} />
    </>
  )
}

export const SettingsUsersTableCard = memo(SettingsUsersTableCardInner)
