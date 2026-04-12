import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { BusinessCenter, BusinessCenterFilterParams } from '@/features/business-centers/types'

type PaginationState = { pageIndex: number; pageSize: number }

type ActionMeta = {
  canUpdate: boolean
  canDelete: boolean
  onEdit: (bc: BusinessCenter) => void
  onDelete: (bc: BusinessCenter) => void
}

const ADS_TYPE_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  google: 'Google',
  unknown: 'Unknown',
}

function getBusinessCentersColumns(meta: ActionMeta): MRT_ColumnDef<BusinessCenter>[] {
  return [
    {
      accessorKey: 'bc_id',
      header: 'BC ID',
      size: 160,
      enableSorting: false,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.bc_id}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 180,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: 'ads_type',
      header: 'Ads Type',
      size: 120,
      enableSorting: false,
      Cell: ({ row }) => {
        const label = ADS_TYPE_LABELS[row.original.ads_type] ?? row.original.ads_type
        return <StatusBadge status={row.original.ads_type} label={label} />
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      size: 150,
      enableSorting: false,
      Cell: ({ row }) => {
        const d = row.original.created_at
        if (!d) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(d).toLocaleString()}</span>
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      size: 150,
      enableSorting: false,
      Cell: ({ row }) => {
        const d = row.original.updated_at
        if (!d) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(d).toLocaleString()}</span>
      },
    },
    ...(meta.canUpdate || meta.canDelete
      ? [
          {
            id: 'actions',
            header: 'Action',
            size: 120,
            enableSorting: false,
            enableGlobalFilter: false,
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: {
                width: 120,
                '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' },
              },
            },
            mantineTableBodyCellProps: { style: { width: 120 } },
            Cell: ({ row }: { row: { original: BusinessCenter } }) => (
              <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                {meta.canUpdate ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => meta.onEdit(row.original)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                ) : null}
                {meta.canDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-destructive"
                    onClick={() => meta.onDelete(row.original)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                ) : null}
              </div>
            ),
          } satisfies MRT_ColumnDef<BusinessCenter>,
        ]
      : []),
  ]
}

type BusinessCentersTableCardProps = {
  data: BusinessCenter[]
  rowCount: number
  loading: boolean
  pagination: PaginationState
  onPaginationChange: (pagination: PaginationState) => void
  filters: BusinessCenterFilterParams
  onFilterChange: (patch: Partial<BusinessCenterFilterParams>) => void
  onFilterReset: () => void
  onSortingChange: (sorting: MRT_SortingState) => void
  canCreate: boolean
  onCreateClick: () => void
  canUpdate: boolean
  onEditClick: (bc: BusinessCenter) => void
  canDelete: boolean
  onDeleteClick: (bc: BusinessCenter) => void
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
}

function BusinessCentersTableCardInner({
  data,
  rowCount,
  loading,
  pagination,
  onPaginationChange,
  filters,
  onFilterChange,
  onFilterReset,
  onSortingChange,
  canCreate,
  onCreateClick,
  canUpdate,
  onEditClick,
  canDelete,
  onDeleteClick,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
}: BusinessCentersTableCardProps) {
  const columns = useMemo(
    () =>
      getBusinessCentersColumns({
        canUpdate,
        canDelete,
        onEdit: onEditClick,
        onDelete: onDeleteClick,
      }),
    [canUpdate, canDelete, onEditClick, onDeleteClick],
  )

  const sorting: MRT_SortingState = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )
  const rowSelection = useMemo<MRT_RowSelectionState>(
    () => Object.fromEntries(data.map((row) => [String(row.id), selectedIds.has(row.id)])),
    [data, selectedIds],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'query',
        label: 'Search',
        type: 'input',
        value: filters.query ?? null,
        placeholder: 'Search by name or BC ID…',
      },
    ],
    [filters],
  )

  const table = useMantineReactTable({
    data,
    columns,
    getRowId: (row) => String(row.id),
    manualPagination: true,
    manualSorting: true,
    rowCount,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      onPaginationChange(next)
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      onSortingChange(next)
    },
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: true,
    enableRowSelection: canDelete,
    initialState: {
      density: 'md',
      columnVisibility: { updated_at: false },
      columnPinning: { right: ['actions'] },
    },
    state: { pagination, sorting, showLoadingOverlay: loading, rowSelection },
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
          {canCreate ? (
            <>
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
                onClick={onCreateClick}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Business Center
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
          onApply={onFilterChange}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <Building2 className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No business centers found.</p>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const BusinessCentersTableCard = memo(BusinessCentersTableCardInner)
