import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { Mail, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
            size: 80,
            enableSorting: false,
            enableGlobalFilter: false,
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: { width: 80, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
            },
            mantineTableBodyCellProps: { style: { width: 80 } },
            Cell: ({ row }: { row: { original: Follow } }) => (
              <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete follow ${row.original.email}`}
                  onClick={() => onDeleteRow(row.original)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
}: FollowsTableCardProps) {
  const columns = useMemo(() => getColumns({ canDelete, onDeleteRow }), [canDelete, onDeleteRow])

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
        pageSize: filters.per_page ?? 15,
      },
      sorting,
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
