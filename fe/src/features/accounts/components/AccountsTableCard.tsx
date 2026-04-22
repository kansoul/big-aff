import { memo, useCallback, useMemo, useState } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  useMantineReactTable,
} from 'mantine-react-table'
import { Pencil, Plus, Trash2, UserCheck, Wallet } from 'lucide-react'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { Account, AccountFilterParams } from '@/features/accounts/types'
import type { SearchableSelectOption } from '@/components/common/SearchableSelect'
import { AssignUserAccountsDialog } from './AssignUserAccountsDialog'

type ToggleField = 'is_special' | 'sync_to_mcc'

type ActionMeta = {
  canUpdate: boolean
  canDelete: boolean
  onEditRow: (row: Account) => void
  onDeleteRow: (row: Account) => void
  onToggleField: (row: Account, field: ToggleField, checked: boolean) => void | Promise<void>
  isFieldUpdating: (rowId: number, field: ToggleField) => boolean
}

function getColumns(meta: ActionMeta): MRT_ColumnDef<Account>[] {
  const { canUpdate, canDelete, onEditRow, onDeleteRow, onToggleField, isFieldUpdating } = meta

  return [
    {
      accessorKey: 'account_id',
      header: 'Account ID',
      size: 180,
      Cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-foreground">
          {row.original.account_id}
        </span>
      ),
    },
    {
      accessorKey: 'account_name',
      header: 'Account Name',
      size: 220,
      Cell: ({ row }) => {
        const accountName = row.original.account_name
        if (!accountName) return <span className="text-muted-foreground/50">-</span>
        return <span className="font-medium text-foreground">{accountName}</span>
      },
    },
    {
      accessorKey: 'business_center',
      header: 'Business Center',
      size: 180,
      enableSorting: false,
      Cell: ({ row }) => {
        const businessCenter = row.original.business_center
        if (!businessCenter) return <span className="text-muted-foreground/50">-</span>
        return <span className="text-muted-foreground">{businessCenter.name}</span>
      },
    },
    {
      accessorKey: 'team',
      header: 'Team',
      size: 150,
      enableSorting: false,
      Cell: ({ row }) => {
        const team = row.original.team
        if (!team) return <span className="text-muted-foreground/50">-</span>
        return <span className="text-muted-foreground">{team.name}</span>
      },
    },
    {
      accessorKey: 'ads_type',
      header: 'Ads Type',
      size: 110,
      Cell: ({ row }) => {
        const adsType = row.original.ads_type
        return <StatusBadge status={adsType} label={adsType} className="capitalize" />
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 120,
      Cell: ({ row }) => {
        const status = row.original.status
        if (!status) return <span className="text-muted-foreground/50">-</span>
        return <StatusBadge status={status} label={status} />
      },
    },
    {
      accessorKey: 'is_special',
      header: 'Special',
      size: 110,
      enableSorting: false,
      Cell: ({ row }) => (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={row.original.is_special}
            disabled={!canUpdate || isFieldUpdating(row.original.id, 'is_special')}
            aria-label={`Toggle special for ${row.original.account_id}`}
            onCheckedChange={(checked) => {
              void onToggleField(row.original, 'is_special', checked)
            }}
          />
        </div>
      ),
    },
    {
      accessorKey: 'sync_to_mcc',
      header: 'Sync MCC',
      size: 120,
      enableSorting: false,
      Cell: ({ row }) => (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={row.original.sync_to_mcc}
            disabled={!canUpdate || isFieldUpdating(row.original.id, 'sync_to_mcc')}
            aria-label={`Toggle sync to MCC for ${row.original.account_id}`}
            onCheckedChange={(checked) => {
              void onToggleField(row.original, 'sync_to_mcc', checked)
            }}
          />
        </div>
      ),
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
      size: 170,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { width: 170, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      mantineTableBodyCellProps: { style: { width: 170 } },
      Cell: ({ row }: { row: { original: Account } }) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-label={`Edit ${row.original.account_id}`}
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
              aria-label={`Delete ${row.original.account_id}`}
              onClick={() => onDeleteRow(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
      ),
    } satisfies MRT_ColumnDef<Account>,
  ]
}

type AccountsTableCardProps = {
  data: Account[]
  businessCenterOptions: SearchableSelectOption[]
  teamOptions: SearchableSelectOption[]
  rowCount: number
  loading: boolean
  filters: AccountFilterParams
  onFilterChange: (patch: Partial<AccountFilterParams>) => void
  onFilterReset: () => void
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: string | null, order: 'asc' | 'desc' | null) => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canAssign: boolean
  onAddClick: () => void
  onEditRow: (row: Account) => void
  onDeleteRow: (row: Account) => void
  onToggleField: (row: Account, field: ToggleField, checked: boolean) => void | Promise<void>
  isFieldUpdating: (rowId: number, field: ToggleField) => boolean
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
}

function AccountsTableCardInner({
  data,
  businessCenterOptions,
  teamOptions,
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
  onToggleField,
  isFieldUpdating,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
}: AccountsTableCardProps) {
  const [assignOpen, setAssignOpen] = useState(false)

  const columns = useMemo(
    () =>
      getColumns({
        canUpdate,
        canDelete,
        onEditRow,
        onDeleteRow,
        onToggleField,
        isFieldUpdating,
      }),
    [canUpdate, canDelete, onEditRow, onDeleteRow, onToggleField, isFieldUpdating],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'query',
        label: 'Keyword',
        type: 'input',
        value: filters.query ?? null,
        placeholder: 'Search account id/name…',
      },
      {
        field: 'ads_type',
        label: 'Ads Type',
        type: 'select',
        value: filters.ads_type ?? null,
        options: [
          { value: 'facebook', label: 'Facebook' },
          { value: 'google', label: 'Google' },
          { value: 'unknown', label: 'Unknown' },
        ],
      },
      {
        field: 'status',
        label: 'Status',
        type: 'input',
        value: filters.status ?? null,
        placeholder: 'e.g. active',
      },
      {
        field: 'business_center_id',
        label: 'Business Center ID',
        type: 'select',
        value: filters.business_center_id != null ? String(filters.business_center_id) : null,
        options: businessCenterOptions,
        placeholder: 'All business centers',
      },
      {
        field: 'team_id',
        label: 'Team',
        type: 'select',
        value: filters.team_id != null ? String(filters.team_id) : null,
        options: teamOptions,
        placeholder: 'All teams',
      },
    ],
    [filters, businessCenterOptions, teamOptions],
  )

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )
  const rowSelection = useMemo<MRT_RowSelectionState>(
    () => Object.fromEntries(data.map((row) => [String(row.id), selectedIds.has(row.id)])),
    [data, selectedIds],
  )

  const onApplyFilters = useCallback(
    (values: Record<string, unknown>) => {
      const parseNullableId = (value: unknown): number | null | undefined => {
        if (value == null || value === '') {
          return undefined
        }
        if (typeof value !== 'string') {
          return undefined
        }

        const parsed = Number(value)
        return Number.isNaN(parsed) ? undefined : parsed
      }

      onFilterChange({
        query: typeof values.query === 'string' ? values.query : undefined,
        ads_type:
          values.ads_type === 'facebook' ||
          values.ads_type === 'google' ||
          values.ads_type === 'unknown'
            ? values.ads_type
            : undefined,
        status: typeof values.status === 'string' ? values.status : undefined,
        business_center_id: parseNullableId(values.business_center_id),
        team_id: parseNullableId(values.team_id),
      })
    },
    [onFilterChange],
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
      columnPinning: { right: ['actions'] },
      columnVisibility: {
        business_center: false,
        team: false,
      },
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
          {canAssign ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
                onClick={() => setAssignOpen(true)}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Assign Accounts
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
                Add Account
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
          onApply={onApplyFilters}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <Wallet className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No accounts found.</p>
      </div>
    ),
  })

  return (
    <>
      <MantineReactTable table={table} />
      <AssignUserAccountsDialog open={assignOpen} onOpenChange={setAssignOpen} />
    </>
  )
}

export const AccountsTableCard = memo(AccountsTableCardInner)
