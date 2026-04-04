import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
} from 'mantine-react-table'
import { AlertCircle, Pencil, Plus, Trash2, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ManagedUser } from '@/shared/types'

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
              sx: { width: 80, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
            },
            mantineTableBodyCellProps: { style: { width: 80 } },
            Cell: ({ row }: { row: { original: ManagedUser } }) => {
              const user = row.original
              return (
                <div className="flex justify-end gap-0.5">
                  {canUpdate ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={`Edit ${user.name}`}
                      onClick={() => onEditRow(user)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  {canDelete && user.id !== currentUserId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${user.name}`}
                      onClick={() => onDeleteRow(user)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
  listError: string | null
  loading: boolean
  users: ManagedUser[]
  currentUserId: number | undefined
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onAddClick: () => void
  onEditRow: (row: ManagedUser) => void
  onDeleteRow: (row: ManagedUser) => void
}

function SettingsUsersTableCardInner({
  listError,
  loading,
  users,
  currentUserId,
  canCreate,
  canUpdate,
  canDelete,
  onAddClick,
  onEditRow,
  onDeleteRow,
}: SettingsUsersTableCardProps) {
  const columns = useMemo(
    () => getUsersColumns({ currentUserId, canUpdate, canDelete, onEditRow, onDeleteRow }),
    [currentUserId, canUpdate, canDelete, onEditRow, onDeleteRow],
  )

  const table = useMantineReactTable({
    data: users,
    columns,
    enableColumnFilters: false,
    enableGlobalFilter: true,
    positionGlobalFilter: 'left',
    initialState: {
      showGlobalFilter: true,
      density: 'md',
      columnVisibility: { parent: false, role: false },
    },
    state: { isLoading: loading },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    mantineSearchTextInputProps: {
      placeholder: 'Search by name or email…',
      sx: { minWidth: 'clamp(120px, 40vw, 260px)' },
    },
    localization: {
      rowsPerPage: 'Per Page', // <-- Custom chữ tại đây
    },
    renderToolbarInternalActions: ({ table: t }) => (
      <div className="flex items-center gap-1">
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
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <Users className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No users in this scope.</p>
      </div>
    ),
  })

  return (
    <>
      {listError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{listError}</p>
        </div>
      ) : null}

      <MantineReactTable table={table} />
    </>
  )
}

export const SettingsUsersTableCard = memo(SettingsUsersTableCardInner)
