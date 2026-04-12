import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
} from 'mantine-react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Role } from '@/shared/types'

import { describeRolePermissions } from './roleSettingsUtils'

type ActionMeta = {
  canUpdate: boolean
  canAssign: boolean
  canDelete: boolean
  onEditRow: (role: Role) => void
  onDeleteRow: (role: Role) => void
}

function getRolesColumns(meta: ActionMeta): MRT_ColumnDef<Role>[] {
  const { canUpdate, canAssign, canDelete, onEditRow, onDeleteRow } = meta

  return [
    {
      accessorKey: 'name',
      header: 'Role',
      size: 140,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: 'permissions',
      header: 'Permissions',
      size: 200,
      Cell: ({ row }) => (
        <span className="text-muted-foreground">
          {describeRolePermissions(row.original.permissions)}
        </span>
      ),
    },
    ...(canUpdate || canAssign || canDelete
      ? [
          {
            id: 'actions',
            header: 'Actions',
            size: 200,
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
            Cell: ({ row }: { row: { original: Role } }) => {
              const role = row.original
              return (
                <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {canUpdate || canAssign ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                      aria-label={`Edit ${role.name}`}
                      onClick={() => onEditRow(role)}
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
                      aria-label={`Delete ${role.name}`}
                      onClick={() => onDeleteRow(role)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              )
            },
          } satisfies MRT_ColumnDef<Role>,
        ]
      : []),
  ]
}

type SettingsRolesTableCardProps = {
  loading: boolean
  roles: Role[]
  canCreate: boolean
  canUpdate: boolean
  canAssign: boolean
  canDelete: boolean
  onAddClick: () => void
  onEditRow: (role: Role) => void
  onDeleteRow: (role: Role) => void
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
}

function SettingsRolesTableCardInner({
  loading,
  roles,
  canCreate,
  canUpdate,
  canAssign,
  canDelete,
  onAddClick,
  onEditRow,
  onDeleteRow,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
}: SettingsRolesTableCardProps) {
  const columns = useMemo(
    () => getRolesColumns({ canUpdate, canAssign, canDelete, onEditRow, onDeleteRow }),
    [canUpdate, canAssign, canDelete, onEditRow, onDeleteRow],
  )
  const rowSelection = useMemo<MRT_RowSelectionState>(
    () => Object.fromEntries(roles.map((row) => [String(row.id), selectedIds.has(row.id)])),
    [roles, selectedIds],
  )

  const table = useMantineReactTable({
    data: roles,
    columns,
    getRowId: (row) => String(row.id),
    enableColumnFilters: false,
    enableGlobalFilter: true,
    positionGlobalFilter: 'left',
    enableColumnPinning: true,
    enableRowSelection: canDelete,
    initialState: {
      showGlobalFilter: true,
      density: 'md',
      columnPinning: { right: ['actions'] },
    },
    state: { showLoadingOverlay: loading, rowSelection },
    onRowSelectionChange: (updater) => {
      const newSelection: MRT_RowSelectionState =
        typeof updater === 'function' ? updater(rowSelection) : updater
      onSelectionChange(() => {
        const next = new Set<number>()
        for (const [idStr, checked] of Object.entries(newSelection)) {
          if (checked) next.add(Number(idStr))
        }
        return next
      })
    },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    mantineSearchTextInputProps: {
      placeholder: 'Search by role name…',
      sx: { minWidth: 'clamp(120px, 40vw, 260px)' },
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
            Add Role
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

export const SettingsRolesTableCard = memo(SettingsRolesTableCardInner)
