import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'

import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { useIsMobile } from '@/hooks/useMobile'
import type { Category, CategoryFilterParams } from '@/features/categories/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
      accessorKey: 'id',
      header: 'ID',
      size: 65,
      Cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">#{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 200,
      Cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block font-medium text-foreground max-w-full">
                {row.original.name}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
              {row.original.name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 240,
      enableSorting: false,
      Cell: ({ row }) => {
        const desc = row.original.description
        if (!desc) return <span className="text-muted-foreground/50">—</span>
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="line-clamp-2 text-muted-foreground cursor-default">{desc}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {desc}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
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
    ...(canUpdate || canDelete
      ? [
          {
            id: 'actions',
            header: 'Action',
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
            Cell: ({ row }: { row: { original: Category } }) => (
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
          } satisfies MRT_ColumnDef<Category>,
        ]
      : []),
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
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
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
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
}: CategoriesTableCardProps) {
  const isMobile = useIsMobile()
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
  const rowSelection = useMemo<MRT_RowSelectionState>(
    () => Object.fromEntries(data.map((row) => [String(row.id), selectedIds.has(row.id)])),
    [data, selectedIds],
  )

  const activeChips = useMemo<ActiveFilterChip[]>(
    () =>
      filters.query ? [{ key: 'query', label: 'Keyword', displayValue: `"${filters.query}"` }] : [],
    [filters.query],
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
    enableColumnPinning: !isMobile,
    enableRowSelection: canDelete,
    initialState: {
      density: 'md',
      columnVisibility: { created_at: false },
    },
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 30,
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
    mantineLoadingOverlayProps: {
      sx: { transform: 'translateX(var(--mrt-scroll-left, 0px))' },
    },
    mantineTableContainerProps: {
      onScroll: (e: React.UIEvent<HTMLDivElement>) => {
        e.currentTarget.style.setProperty('--mrt-scroll-left', `${e.currentTarget.scrollLeft}px`)
      },
      sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: (event) => {
        const target = event.target as HTMLElement
        if (target.closest('button,input,a,[role="checkbox"]')) return
        onViewRow(row.original)
      },
      sx: { cursor: 'pointer' },
    }),
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Categories</span>
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
            {canCreate ? (
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={onAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Category
              </Button>
            ) : null}
            {canCreate && <div className="h-4 w-px bg-border" />}
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <FilterPanel
            fields={filterFields}
            onReset={onFilterReset}
            applyMode
            onApply={onFilterChange}
          />
        </div>
        <ActiveFilterChips
          chips={activeChips}
          onRemove={() => onFilterChange({ query: null })}
          onClearAll={onFilterReset}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FolderOpen className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No categories found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or add a new category.
          </p>
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const CategoriesTableCard = memo(CategoriesTableCardInner)
