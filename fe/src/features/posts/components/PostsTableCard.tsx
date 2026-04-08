import { memo, useMemo, type Dispatch, type SetStateAction } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { Eye, FileText, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Post, PostFilterParams, PostStatus } from '@/features/posts/types'

type PaginationState = { pageIndex: number; pageSize: number }

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

const STATUS_COLORS: Record<PostStatus, string> = {
  draft: 'bg-muted text-muted-foreground ring-border',
  published:
    'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 ring-green-200 dark:ring-green-900',
  archived:
    'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 ring-red-200 dark:ring-red-900',
}

type ActionMeta = {
  canUpdate: boolean
  canDelete: boolean
  onViewRow: (row: Post) => void
  onEditRow: (row: Post) => void
  onDeleteRow: (row: Post) => void
}

function getColumns(meta: ActionMeta): MRT_ColumnDef<Post>[] {
  const { canUpdate, canDelete, onViewRow, onEditRow, onDeleteRow } = meta

  return [
    {
      accessorKey: 'title',
      header: 'Title',
      size: 220,
      Cell: ({ row }) => (
        <span className="font-medium text-foreground line-clamp-2">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      Cell: ({ row }) => {
        const s = row.original.status
        if (!s) return <span className="text-muted-foreground/50">—</span>
        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_COLORS[s]}`}
          >
            {STATUS_LABELS[s]}
          </span>
        )
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      size: 100,
      Cell: ({ row }) => {
        const t = row.original.type
        if (!t) return <span className="text-muted-foreground/50">—</span>
        return (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
            {t}
          </span>
        )
      },
    },
    {
      accessorKey: 'lang',
      header: 'Lang',
      size: 70,
      enableSorting: false,
      Cell: ({ row }) => <span className="text-muted-foreground">{row.original.lang ?? '—'}</span>,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      size: 130,
      enableSorting: false,
      Cell: ({ row }) => {
        const cat = row.original.category
        if (!cat) return <span className="text-muted-foreground/50">—</span>
        return (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
            {cat.name}
          </span>
        )
      },
    },
    {
      accessorKey: 'published_at',
      header: 'Published At',
      size: 150,
      Cell: ({ row }) => {
        const d = row.original.published_at
        if (!d) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(d).toLocaleString()}</span>
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      size: 150,
      Cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Action',
      size: 100,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { width: 100, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      mantineTableBodyCellProps: { style: { width: 100 } },
      Cell: ({ row }: { row: { original: Post } }) => (
        <div className="flex justify-end gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`View ${row.original.title}`}
            onClick={() => onViewRow(row.original)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={`Edit ${row.original.title}`}
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
              aria-label={`Delete ${row.original.title}`}
              onClick={() => onDeleteRow(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    } satisfies MRT_ColumnDef<Post>,
  ]
}

type PostsTableCardProps = {
  data: Post[]
  rowCount: number
  loading: boolean
  pagination: PaginationState
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>
  filters: PostFilterParams
  onFilterChange: (field: keyof PostFilterParams, value: string | null) => void
  onSortingChange: (sorting: MRT_SortingState) => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onAddClick: () => void
  onViewRow: (row: Post) => void
  onEditRow: (row: Post) => void
  onDeleteRow: (row: Post) => void
}

function PostsTableCardInner({
  data,
  rowCount,
  loading,
  pagination,
  onPaginationChange,
  filters,
  onFilterChange,
  onSortingChange,
  canCreate,
  canUpdate,
  canDelete,
  onAddClick,
  onViewRow,
  onEditRow,
  onDeleteRow,
}: PostsTableCardProps) {
  const columns = useMemo(
    () => getColumns({ canUpdate, canDelete, onViewRow, onEditRow, onDeleteRow }),
    [canUpdate, canDelete, onViewRow, onEditRow, onDeleteRow],
  )

  const sorting: MRT_SortingState = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )

  const table = useMantineReactTable({
    data,
    columns,
    manualPagination: true,
    manualSorting: true,
    rowCount,
    onPaginationChange,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      onSortingChange(next)
    },
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: true,
    initialState: {
      density: 'md',
      columnVisibility: { created_at: false },
      columnPinning: { right: ['actions'] },
    },
    state: { pagination, sorting, showLoadingOverlay: loading },

    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbarCustomActions: () => (
      <div className="flex flex-wrap items-end gap-3 py-1">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Input
            value={filters.query ?? ''}
            onChange={(e) => onFilterChange('query', e.target.value || null)}
            placeholder="Search posts…"
            className="h-8 w-48 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={filters.status ?? '__all__'}
            onValueChange={(v) => onFilterChange('status', v === '__all__' ? null : v)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    ),
    renderToolbarInternalActions: ({ table: t }) => (
      <div className="flex items-center gap-1">
        {canCreate ? (
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
            onClick={onAddClick}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Post
          </Button>
        ) : null}
        <div className="mx-1 h-5 w-px bg-border" />
        <MRT_ShowHideColumnsButton table={t} />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No posts found.</p>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const PostsTableCard = memo(PostsTableCardInner)
