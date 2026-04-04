import { memo, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import type { ManagedUser } from '@/shared/types'

type ActionMeta = {
  currentUserId: number | undefined
  canUpdate: boolean
  canDelete: boolean
  onEditRow: (row: ManagedUser) => void
  onDeleteRow: (row: ManagedUser) => void
}

function getUsersColumns(meta: ActionMeta): ColumnDef<ManagedUser>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role
        return <span className="text-muted-foreground">{role?.name ?? '—'}</span>
      },
    },
    {
      accessorKey: 'parent',
      header: 'Parent',
      cell: ({ row }) => {
        const parent = row.original.parent
        return <span className="text-muted-foreground">{parent?.name ?? '—'}</span>
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const user = row.original
        const { canUpdate, canDelete, currentUserId, onEditRow, onDeleteRow } = meta

        if (!canUpdate && !canDelete) return null

        return (
          <div className="flex justify-end gap-1">
            {canUpdate ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label={`Edit ${user.name}`}
                onClick={() => onEditRow(user)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
            {canDelete && user.id !== currentUserId ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive"
                aria-label={`Delete ${user.name}`}
                onClick={() => onDeleteRow(user)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        )
      },
    },
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
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const columns = getUsersColumns({ currentUserId, canUpdate, canDelete, onEditRow, onDeleteRow })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, _columnId, filterValue) => {
      const name = String(row.getValue('name')).toLowerCase()
      const email = String(row.getValue('email')).toLowerCase()
      const search = String(filterValue).toLowerCase()
      return name.includes(search) || email.includes(search)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <>
      {listError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{listError}</p>
        </div>
      ) : null}

      <Card className="mt-4 border-border shadow-none">
        <CardHeader>
          <DataTableToolbar table={table} searchPlaceholder="Search by name or email…" />
          {canCreate ? (
            <CardAction>
              <Button className="font-bold tracking-widest" onClick={onAddClick}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent border-y">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          'text-xs font-bold tracking-widest',
                          header.column.columnDef.meta?.className,
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="py-10 text-center text-muted-foreground text-sm"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="py-10 text-center text-muted-foreground text-sm"
                    >
                      No users in this scope.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn('py-1 text-sm', cell.column.columnDef.meta?.className)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4">
            <DataTablePagination table={table} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export const SettingsUsersTableCard = memo(SettingsUsersTableCardInner)
