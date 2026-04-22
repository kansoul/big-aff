import { memo, useMemo, useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { EyeOff, FileText, Globe, GlobeLock, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useIsMobile } from '@/hooks/useMobile'
import { LANGUAGE_OPTIONS } from '@/constants/languages'
import { userOptionsApi } from '@/features/posts/api'
import { categoriesApi } from '@/features/categories/api'
import type { Post, PostFilterParams } from '@/features/posts/types'

type PaginationState = { pageIndex: number; pageSize: number }

type ActionMeta = {
  canUpdate: boolean
  canDelete: boolean
  canPublish: boolean
  onViewRow: (row: Post) => void
  onEditRow: (row: Post) => void
  onDeleteRow: (row: Post) => void
  onToggleHidden: (row: Post) => void
  onPublishRow: (row: Post, publish: boolean) => void
}

function getColumns(meta: ActionMeta): MRT_ColumnDef<Post>[] {
  const { canUpdate, canDelete, canPublish, onEditRow, onDeleteRow, onToggleHidden, onPublishRow } =
    meta

  return [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 70,
      Cell: ({ row }) => <span className="text-xs text-muted-foreground">#{row.original.id}</span>,
    },
    {
      accessorKey: 'feature_media',
      header: 'Image',
      size: 70,
      enableSorting: false,
      Cell: ({ row }) => {
        const media = row.original.feature_media
        if (!media) return <span className="text-muted-foreground/30 text-xs">—</span>
        return (
          <img src={media.url} alt={row.original.title} className="h-9 w-14 rounded object-cover" />
        )
      },
    },
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
      Cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'created_by',
      header: 'User',
      size: 90,
      enableSorting: false,
      Cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.created_by ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'note',
      header: 'Note',
      size: 150,
      enableSorting: false,
      Cell: ({ row }) => (
        <span className="text-muted-foreground text-xs line-clamp-2">
          {row.original.note ?? <span className="opacity-30">—</span>}
        </span>
      ),
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
      id: 'actions',
      header: 'Action',
      size: 290,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { width: 290, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      mantineTableBodyCellProps: { style: { width: 290 } },
      Cell: ({ row }: { row: { original: Post } }) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {canUpdate ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-8 gap-1.5 px-2 text-xs font-medium ${
                  row.original.is_hidden
                    ? 'text-destructive focus:text-destructive hover:text-destructive'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={
                  row.original.is_hidden
                    ? `Unhide ${row.original.title}`
                    : `Hide ${row.original.title}`
                }
                onClick={() => onToggleHidden(row.original)}
              >
                <EyeOff className="h-3.5 w-3.5" />
                {row.original.is_hidden ? 'Unhide' : 'Hide'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                aria-label={`Edit ${row.original.title}`}
                onClick={() => onEditRow(row.original)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </>
          ) : null}
          {canPublish ? (
            row.original.status === 'published' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                aria-label={`Unpublish ${row.original.title}`}
                onClick={() => onPublishRow(row.original, false)}
              >
                <GlobeLock className="h-3.5 w-3.5" />
                Unpublish
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                aria-label={`Publish ${row.original.title}`}
                onClick={() => onPublishRow(row.original, true)}
              >
                <Globe className="h-3.5 w-3.5" />
                Publish
              </Button>
            )
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${row.original.title}`}
              onClick={() => onDeleteRow(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
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
  onFilterChange: (patch: Partial<PostFilterParams>) => void
  onFilterReset: () => void
  onSortingChange: (sorting: MRT_SortingState) => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canPublish: boolean
  onAddClick: () => void
  onViewRow: (row: Post) => void
  onEditRow: (row: Post) => void
  onDeleteRow: (row: Post) => void
  onToggleHidden: (row: Post) => void
  onPublishRow: (row: Post, publish: boolean) => void
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
}

function PostsTableCardInner({
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
  canUpdate,
  canDelete,
  canPublish,
  onAddClick,
  onViewRow,
  onEditRow,
  onDeleteRow,
  onToggleHidden,
  onPublishRow,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
}: PostsTableCardProps) {
  const isMobile = useIsMobile()
  const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([])
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([])

  useEffect(() => {
    void userOptionsApi.list().then(setUserOptions).catch(console.error)
    void categoriesApi
      .list({ page: 1, per_page: 100, query: null, order: null, order_by: null })
      .then((res) => {
        setCategoryOptions(res.data.data.map((c) => ({ label: c.name, value: String(c.id) })))
      })
      .catch(console.error)
  }, [])

  const columns = useMemo(
    () =>
      getColumns({
        canUpdate,
        canDelete,
        canPublish,
        onViewRow,
        onEditRow,
        onDeleteRow,
        onToggleHidden,
        onPublishRow,
      }),
    [
      canUpdate,
      canDelete,
      canPublish,
      onViewRow,
      onEditRow,
      onDeleteRow,
      onToggleHidden,
      onPublishRow,
    ],
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
        placeholder: 'Search posts…',
      },
      {
        field: 'status',
        label: 'Status',
        type: 'select',
        value: filters.status ?? null,
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
          { label: 'Archived', value: 'archived' },
          { label: 'Trash', value: 'trash' },
        ],
      },
      {
        field: 'type',
        label: 'Type',
        type: 'select',
        value: filters.type ?? null,
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'AI', value: 'ai' },
          { label: 'Wordpress', value: 'wordpress' },
        ],
      },
      {
        field: 'lang',
        label: 'Language',
        type: 'select',
        value: filters.lang ?? null,
        options: LANGUAGE_OPTIONS,
      },
      {
        field: 'category_id',
        label: 'Category',
        type: 'select',
        value: filters.category_id ? String(filters.category_id) : null,
        options: categoryOptions,
      },
      {
        field: 'created_by',
        label: 'Creator',
        type: 'select',
        value: filters.created_by ? String(filters.created_by) : null,
        options: userOptions,
      },
      {
        field: 'created_at',
        label: 'Created At',
        type: 'daterange',
        value: {
          from: filters.created_at_from ?? null,
          to: filters.created_at_to ?? null,
        } as DateRangeValue,
        placeholder: 'Select range',
      },
      {
        field: 'is_hidden',
        label: 'Hidden',
        type: 'select',
        value:
          filters.is_hidden !== undefined && filters.is_hidden !== null
            ? String(filters.is_hidden)
            : null,
        options: [
          { label: 'Visible', value: '0' },
          { label: 'Hidden', value: '1' },
        ],
      },
    ],
    [filters, userOptions, categoryOptions],
  )

  const table = useMantineReactTable({
    data,
    columns,
    getRowId: (row) => String(row.id),
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
    enableColumnPinning: !isMobile,
    enableRowSelection: canDelete,
    initialState: {
      density: 'md',
    },
    state: {
      pagination,
      sorting,
      showLoadingOverlay: loading,
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
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
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
                Add Post
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
          onApply={(values) => {
            const { created_at, ...rest } = values
            const range = created_at as DateRangeValue | undefined
            onFilterChange({
              ...(rest as Partial<PostFilterParams>),
              created_at_from: range?.from ?? null,
              created_at_to: range?.to ?? null,
            })
          }}
        />
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
