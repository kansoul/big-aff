import { memo, useCallback, useMemo } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  useMantineReactTable,
} from 'mantine-react-table'
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Button } from '@/components/ui/button'
import type { AdClient, AdClientFilterParams } from '@/features/ad-clients/types'

type ActionMeta = {
  canUpdate: boolean
  canDelete: boolean
  onEditRow: (row: AdClient) => void
  onDeleteRow: (row: AdClient) => void
}

function getColumns(meta: ActionMeta): MRT_ColumnDef<AdClient>[] {
  const { canUpdate, canDelete, onEditRow, onDeleteRow } = meta

  return [
    {
      accessorKey: 'ad_client_id',
      header: 'Ad Client ID',
      size: 220,
      Cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-foreground">
          {row.original.ad_client_id}
        </span>
      ),
    },
    {
      accessorKey: 'product_code',
      header: 'Product Code',
      size: 160,
      Cell: ({ row }) => {
        const val = row.original.product_code
        if (!val) return <span className="text-muted-foreground/50">—</span>
        return (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
            {val}
          </span>
        )
      },
    },
    {
      accessorKey: 'product_name',
      header: 'Product Name',
      size: 200,
      Cell: ({ row }) => {
        const val = row.original.product_name
        if (!val) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{val}</span>
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      size: 170,
      Cell: ({ row }) => {
        const val = row.original.created_at
        if (!val) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(val).toLocaleString()}</span>
      },
    },
    {
      id: 'actions',
      header: 'Action',
      size: 80,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { width: 80, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      mantineTableBodyCellProps: { style: { width: 80 } },
      Cell: ({ row }: { row: { original: AdClient } }) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={`Edit ${row.original.ad_client_id}`}
              onClick={() => onEditRow(row.original)}
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
              aria-label={`Delete ${row.original.ad_client_id}`}
              onClick={() => onDeleteRow(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    } satisfies MRT_ColumnDef<AdClient>,
  ]
}

type AdClientsTableCardProps = {
  data: AdClient[]
  rowCount: number
  loading: boolean
  filters: AdClientFilterParams
  onFilterChange: (patch: Partial<AdClientFilterParams>) => void
  onFilterReset: () => void
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: string | null, order: 'asc' | 'desc' | null) => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onAddClick: () => void
  onEditRow: (row: AdClient) => void
  onDeleteRow: (row: AdClient) => void
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
}

function AdClientsTableCardInner({
  data,
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
  onAddClick,
  onEditRow,
  onDeleteRow,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
}: AdClientsTableCardProps) {
  const columns = useMemo(
    () => getColumns({ canUpdate, canDelete, onEditRow, onDeleteRow }),
    [canUpdate, canDelete, onEditRow, onDeleteRow],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'query',
        label: 'Keyword',
        type: 'input',
        value: filters.query ?? null,
        placeholder: 'Search by ID, code or name…',
      },
    ],
    [filters],
  )

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )

  // Derive MRT rowSelection from the global selectedIds for the current page only.
  // Keys are string row IDs (ad client `id`); true = selected.
  const rowSelection = useMemo<MRT_RowSelectionState>(
    () => Object.fromEntries(data.map((row) => [String(row.id), selectedIds.has(row.id)])),
    [data, selectedIds],
  )

  const onApplyFilters = useCallback(
    (values: Record<string, unknown>) => {
      onFilterChange({
        query: typeof values.query === 'string' ? values.query : undefined,
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
    positionToolbarAlertBanner: 'none',
    initialState: {
      density: 'md',
      columnPinning: { right: ['actions'] },
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
        // Remove all current-page IDs, then re-add the ones still selected
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
          {canCreate ? (
            <>
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
                onClick={onAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Ad Client
              </Button>
              <div className="mx-1 h-5 w-px bg-border" />
            </>
          ) : null}
          <MRT_ToggleGlobalFilterButton table={t} />
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
        <CreditCard className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No ad clients found.</p>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const AdClientsTableCard = memo(AdClientsTableCardInner)
