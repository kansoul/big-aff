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
import type { Role } from '@/shared/types'

import { describeRolePermissions } from './roleSettingsUtils'

type ActionMeta = {
  canUpdate: boolean
  canAssign: boolean
  canDelete: boolean
  onEditRow: (role: Role) => void
  onDeleteRow: (role: Role) => void
}

function getRolesColumns(meta: ActionMeta): ColumnDef<Role>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Role',
    },
    {
      accessorKey: 'permissions',
      header: 'Permissions',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {describeRolePermissions(row.original.permissions)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const role = row.original
        const { canUpdate, canAssign, canDelete, onEditRow, onDeleteRow } = meta

        if (!canUpdate && !canAssign && !canDelete) {
          return <span className="text-muted-foreground text-sm">—</span>
        }

        return (
          <div className="flex justify-end gap-1">
            {canUpdate || canAssign ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label={`Edit ${role.name}`}
                onClick={() => onEditRow(role)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive"
                aria-label={`Delete ${role.name}`}
                onClick={() => onDeleteRow(role)}
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

type SettingsRolesTableCardProps = {
  listError: string | null
  loading: boolean
  roles: Role[]
  canCreate: boolean
  canUpdate: boolean
  canAssign: boolean
  canDelete: boolean
  onAddClick: () => void
  onEditRow: (role: Role) => void
  onDeleteRow: (role: Role) => void
}

function SettingsRolesTableCardInner({
  listError,
  loading,
  roles,
  canCreate,
  canUpdate,
  canAssign,
  canDelete,
  onAddClick,
  onEditRow,
  onDeleteRow,
}: SettingsRolesTableCardProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const columns = getRolesColumns({ canUpdate, canAssign, canDelete, onEditRow, onDeleteRow })

  const table = useReactTable({
    data: roles,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, _columnId, filterValue) => {
      const name = String(row.original?.name).toLowerCase()
      return name.includes(String(filterValue).toLowerCase())
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
          <DataTableToolbar table={table} searchPlaceholder="Search by role name…" />
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
                        className="text-xs font-bold tracking-widest"
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
                      No roles yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-1 text-sm">
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

export const SettingsRolesTableCard = memo(SettingsRolesTableCardInner)
