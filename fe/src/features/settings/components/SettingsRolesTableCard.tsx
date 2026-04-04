import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
} from 'mantine-react-table'
import { AlertCircle, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'

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
            size: 80,
            enableSorting: false,
            enableGlobalFilter: false,
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: { width: 80, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
            },
            mantineTableBodyCellProps: { style: { width: 80 } },
            Cell: ({ row }: { row: { original: Role } }) => {
              const role = row.original
              return (
                <div className="flex justify-end gap-0.5">
                  {canUpdate || canAssign ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={`Edit ${role.name}`}
                      onClick={() => onEditRow(role)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${role.name}`}
                      onClick={() => onDeleteRow(role)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
  const columns = useMemo(
    () => getRolesColumns({ canUpdate, canAssign, canDelete, onEditRow, onDeleteRow }),
    [canUpdate, canAssign, canDelete, onEditRow, onDeleteRow],
  )

  const table = useMantineReactTable({
    data: roles,
    columns,
    enableColumnFilters: false,
    enableGlobalFilter: true,
    positionGlobalFilter: 'left',
    initialState: {
      showGlobalFilter: true,
      density: 'md',
    },
    state: { isLoading: loading },
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
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No roles yet. Create one to get started.</p>
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

export const SettingsRolesTableCard = memo(SettingsRolesTableCardInner)
