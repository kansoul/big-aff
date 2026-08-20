import { memo, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react'

import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/useMobile'
import type { Role } from '@/shared/types'

import { describeRolePermissions } from './roleSettingsUtils'

type ActionMeta = {
  canUpdate: boolean
  canAssign: boolean
  hasDeletableRows: boolean
  onEditRow: (role: Role) => void
  onDeleteRow: (role: Role) => void
}

function isSystemRole(role: Role): boolean {
  return role.permissions.includes('*')
}

function getRolesColumns(meta: ActionMeta): MRT_ColumnDef<Role>[] {
  const { canUpdate, canAssign, hasDeletableRows, onEditRow, onDeleteRow } = meta

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
      header: 'Role',
      size: 140,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: 'permissions',
      header: 'Permissions',
      size: 200,
      Cell: ({ row }) => {
        const desc = describeRolePermissions(row.original.permissions)
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block text-muted-foreground max-w-full">{desc}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {desc}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    ...(canUpdate || canAssign || hasDeletableRows
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
            Cell: ({ row }: { row: { original: Role } }) => {
              const role = row.original
              const lockedRole = isSystemRole(role)
              return (
                <TooltipProvider>
                  <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {(canUpdate || canAssign) && !lockedRole ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onEditRow(role)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Edit
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    {hasDeletableRows && !lockedRole ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDeleteRow(role)}
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
}: SettingsRolesTableCardProps) {
  const [keyword, setKeyword] = useState('')
  const isMobile = useIsMobile()
  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
  )
  const hasDeletableRows = canDelete && roles.some((row) => !isSystemRole(row))
  const columns = useMemo(
    () => getRolesColumns({ canUpdate, canAssign, hasDeletableRows, onEditRow, onDeleteRow }),
    [canUpdate, canAssign, hasDeletableRows, onEditRow, onDeleteRow],
  )
  const filteredRoles = useMemo(
    () =>
      keyword
        ? roles.filter((role) => role.name.toLowerCase().includes(keyword.toLowerCase()))
        : roles,
    [keyword, roles],
  )
  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'keyword',
        label: 'Search',
        type: 'input',
        value: keyword || null,
        placeholder: 'Search role name…',
      },
    ],
    [keyword],
  )
  const activeChips = useMemo<ActiveFilterChip[]>(
    () => (keyword ? [{ key: 'keyword', label: 'Search', displayValue: `“${keyword}”` }] : []),
    [keyword],
  )

  const table = useMantineReactTable({
    data: filteredRoles,
    columns,
    getRowId: (row) => String(row.id),
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    initialState: {
      density: 'xs',
    },
    state: {
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
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Roles</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {roles.length.toLocaleString()}
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
                Add Role
              </Button>
            ) : null}
            {canCreate && <div className="h-4 w-px bg-border" />}
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <FilterPanel
            fields={filterFields}
            applyMode
            onApply={(values) =>
              setKeyword(typeof values.keyword === 'string' ? values.keyword : '')
            }
            onReset={() => setKeyword('')}
          />
        </div>
        <ActiveFilterChips
          chips={activeChips}
          onRemove={() => setKeyword('')}
          onClearAll={() => setKeyword('')}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Shield className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No roles found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search or add a new role.
          </p>
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const SettingsRolesTableCard = memo(SettingsRolesTableCardInner)
