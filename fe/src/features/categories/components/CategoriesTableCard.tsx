import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
} from 'mantine-react-table'
import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import type { Category, CategoryFilterParams } from '@/features/categories/types'

type ActionMeta = {
  canUpdate: boolean
  canDelete: boolean
  onViewRow: (row: Category) => void
  onEditRow: (row: Category) => void
  onDeleteRow: (row: Category) => void
}

function getColumns(meta: ActionMeta): MRT_ColumnDef<Category>[] {
  const { canUpdate, canDelete, onEditRow, onDeleteRow } = meta

  return [
    {
      accessorKey: 'name',
      header: 'Name',
      size: 200,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 240,
      enableSorting: false,
      Cell: ({ row }) => {
        const desc = row.original.description
        if (!desc) return <span className="text-muted-foreground/50">—</span>
        return <span className="line-clamp-2 text-muted-foreground">{desc}</span>
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      size: 150,
      Cell: ({ row }) => {
        const d = row.original.created_at
        if (!d) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(d).toLocaleString()}</span>
      },
    },
    {
      id: 'actions',
      header: 'Action',
      size: 200,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { width: 200, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      mantineTableBodyCellProps: { style: { width: 200 } },
      Cell: ({ row }: { row: { original: Category } }) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-label={`Edit ${row.original.name}`}
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
              aria-label={`Delete ${row.original.name}`}
              onClick={() => onDeleteRow(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
      ),
    } satisfies MRT_ColumnDef<Category>,
  ]
}

type CategoriesTableCardProps = {
  data: Category[]
  rowCount: number
  loading: boolean
  filters: CategoryFilterParams
  onFilterChange: (patch: Partial<CategoryFilterParams>) => void
  onFilterReset: () => void
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: string | null, order: 'asc' | 'desc' | null) => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onAddClick: () => void
  onViewRow: (row: Category) => void
  onEditRow: (row: Category) => void
  onDeleteRow: (row: Category) => void
}

function CategoriesTableCardInner({
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
  onViewRow,
  onEditRow,
  onDeleteRow,
}: CategoriesTableCardProps) {
  const columns = useMemo(
    () => getColumns({ canUpdate, canDelete, onViewRow, onEditRow, onDeleteRow }),
    [canUpdate, canDelete, onViewRow, onEditRow, onDeleteRow],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'query',
        label: 'Keyword',
        type: 'input',
        value: filters.query ?? null,
        placeholder: 'Search categories…',
      },
    ],
    [filters.query],
  )

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )

  const table = useMantineReactTable({
    data,
    columns,
    manualPagination: true,
    manualSorting: true,
    rowCount,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: true,
    initialState: {
      density: 'md',
      columnVisibility: { created_at: false },
      columnPinning: { right: ['actions'] },
    },
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 30,
      },
      sorting,
    },
    onPaginationChange: (updater) => {
      const current = {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 30,
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
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => onViewRow(row.original),
      sx: { cursor: 'pointer' },
    }),
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col gap-4 rounded-md border bg-muted/20 p-4">
        <div className="flex w-full items-center justify-end gap-2">
          {canCreate ? (
            <>
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
                onClick={onAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Category
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
          onApply={onFilterChange}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <FolderOpen className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No categories found.</p>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const CategoriesTableCard = memo(CategoriesTableCardInner)
