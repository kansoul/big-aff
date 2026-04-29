import { memo, useCallback, useMemo, useState } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  useMantineReactTable,
} from 'mantine-react-table'
import { Pencil, Plus, Trash2, UserCheck, Wallet } from 'lucide-react'

import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { useIsMobile } from '@/hooks/useMobile'
import type { Account, AccountFilterParams } from '@/features/accounts/types'
import { ACCOUNT_STATUS_OPTIONS } from '@/features/accounts/types'
import type { SearchableSelectOption } from '@/components/common/SearchableSelect'
import { AssignUserAccountsDialog } from './AssignUserAccountsDialog'

type ToggleField = 'is_special' | 'sync_to_mcc'

const ADS_TYPE_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
] as const

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
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block font-medium text-foreground max-w-full">
                  {accountName}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {accountName}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
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
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block text-muted-foreground max-w-full">
                  {businessCenter.name}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {businessCenter.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
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
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block text-muted-foreground max-w-full">{team.name}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {team.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
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
    ...(canUpdate || canDelete
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
            Cell: ({ row }: { row: { original: Account } }) => (
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
                          onClick={() => onEditRow(row.original)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Edit
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {canDelete ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteRow(row.original)}
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
            ),
          } satisfies MRT_ColumnDef<Account>,
        ]
      : []),
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
  const isMobile = useIsMobile()
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
        options: [...ADS_TYPE_OPTIONS],
      },
      {
        field: 'status',
        label: 'Status',
        type: 'select',
        value: filters.status ?? null,
        options: [...ACCOUNT_STATUS_OPTIONS],
        placeholder: 'All statuses',
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
        status: ACCOUNT_STATUS_OPTIONS.some((option) => option.value === values.status)
          ? (values.status as AccountFilterParams['status'])
          : undefined,
        business_center_id: parseNullableId(values.business_center_id),
        team_id: parseNullableId(values.team_id),
      })
    },
    [onFilterChange],
  )

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []

    if (filters.query) {
      chips.push({ key: 'query', label: 'Keyword', displayValue: `"${filters.query}"` })
    }
    if (filters.ads_type) {
      const opt = ADS_TYPE_OPTIONS.find((option) => option.value === filters.ads_type)
      chips.push({
        key: 'ads_type',
        label: 'Ads Type',
        displayValue: opt?.label ?? filters.ads_type,
      })
    }
    if (filters.status) {
      const opt = ACCOUNT_STATUS_OPTIONS.find((option) => option.value === filters.status)
      chips.push({
        key: 'status',
        label: 'Status',
        displayValue: opt?.label ?? filters.status,
      })
    }
    if (filters.business_center_id != null) {
      const opt = businessCenterOptions.find(
        (option) => option.value === String(filters.business_center_id),
      )
      chips.push({
        key: 'business_center_id',
        label: 'Business Center',
        displayValue: opt?.label ?? String(filters.business_center_id),
      })
    }
    if (filters.team_id != null) {
      const opt = teamOptions.find((option) => option.value === String(filters.team_id))
      chips.push({
        key: 'team_id',
        label: 'Team',
        displayValue: opt?.label ?? String(filters.team_id),
      })
    }

    return chips
  }, [filters, businessCenterOptions, teamOptions])

  function handleRemoveChip(key: string) {
    if (key === 'business_center_id') {
      onFilterChange({ business_center_id: undefined })
    } else if (key === 'team_id') {
      onFilterChange({ team_id: undefined })
    } else {
      onFilterChange({ [key]: null } as Partial<AccountFilterParams>)
    }
  }

  const table = useMantineReactTable({
    data,
    columns,
    getRowId: (row) => String(row.id),
    manualPagination: true,
    manualSorting: true,
    rowCount,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    enableRowSelection: canDelete,
    initialState: {
      density: 'md',
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
      columnPinning: { right: isMobile ? [] : ['actions'] },
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
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Accounts</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {rowCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
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
            {canAssign ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={() => setAssignOpen(true)}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Assign Accounts
              </Button>
            ) : null}
            {canCreate ? (
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={onAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Account
              </Button>
            ) : null}
            {(canAssign || canCreate) && <div className="h-4 w-px bg-border" />}
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <FilterPanel
            fields={filterFields}
            onReset={onFilterReset}
            applyMode
            onApply={onApplyFilters}
          />
        </div>
        <ActiveFilterChips
          chips={activeChips}
          onRemove={handleRemoveChip}
          onClearAll={onFilterReset}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Wallet className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No accounts found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or add a new account.
          </p>
        </div>
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
