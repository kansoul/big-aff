import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { Mail, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/useMobile'
import type { Follow, FollowFilterParams } from '@/features/follows/types'

type ActionMeta = {
  canDelete: boolean
  onDeleteRow: (row: Follow) => void
}

function getColumns(meta: ActionMeta): MRT_ColumnDef<Follow>[] {
  const { canDelete, onDeleteRow } = meta

  return [
    {
      accessorKey: 'email',
      header: 'Email',
      size: 220,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: 'site_id',
      header: 'Site ID',
      size: 100,
      enableSorting: true,
      Cell: ({ row }) => {
        const val = row.original.site_id
        if (val == null) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{val}</span>
      },
    },
    {
      accessorKey: 'post_id',
      header: 'Post ID',
      size: 100,
      enableSorting: true,
      Cell: ({ row }) => {
        const val = row.original.post_id
        if (val == null) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{val}</span>
      },
    },
    {
      accessorKey: 'style_code',
      header: 'Style',
      size: 120,
      enableSorting: false,
      Cell: ({ row }) => {
        const val = row.original.style_code
        if (!val) return <span className="text-muted-foreground/50">—</span>
        return (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
            {val}
          </span>
        )
      },
    },
    {
      accessorKey: 'channel_code',
      header: 'Channel',
      size: 120,
      enableSorting: false,
      Cell: ({ row }) => {
        const val = row.original.channel_code
        if (!val) return <span className="text-muted-foreground/50">—</span>
        return (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
            {val}
          </span>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      size: 160,
      Cell: ({ row }) => {
        const d = row.original.created_at
        if (!d) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(d).toLocaleString()}</span>
      },
    },
    ...(canDelete
      ? [
          {
            id: 'actions',
            header: 'Action',
            size: 90,
            enableSorting: false,
            enableGlobalFilter: false,
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: { width: 90, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
            },
            mantineTableBodyCellProps: { style: { width: 90 } },
            Cell: ({ row }: { row: { original: Follow } }) => (
              <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-destructive"
                  aria-label={`Delete follow ${row.original.email}`}
                  onClick={() => onDeleteRow(row.original)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            ),
          } satisfies MRT_ColumnDef<Follow>,
        ]
      : []),
  ]
}

type FollowsTableCardProps = {
  data: Follow[]
  rowCount: number
  loading: boolean
  filters: FollowFilterParams
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: string | null, order: 'asc' | 'desc' | null) => void
  canDelete: boolean
  onDeleteRow: (row: Follow) => void
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
}

function FollowsTableCardInner({
  data,
  rowCount,
  loading,
  filters,
  onPaginationChange,
  onSortingChange,
  canDelete,
  onDeleteRow,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
}: FollowsTableCardProps) {
  const isMobile = useIsMobile()
  const columns = useMemo(() => getColumns({ canDelete, onDeleteRow }), [canDelete, onDeleteRow])

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )
  const rowSelection = useMemo<MRT_RowSelectionState>(
    () => Object.fromEntries(data.map((row) => [String(row.id), selectedIds.has(row.id)])),
    [data, selectedIds],
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
      <div className="flex w-full items-center justify-end gap-2 rounded-md border bg-muted/20 p-4">
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
        <MRT_ShowHideColumnsButton table={t} />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <Mail className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No follows found.</p>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const FollowsTableCard = memo(FollowsTableCardInner)
