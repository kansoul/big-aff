import { memo, useMemo, useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import {
  ClipboardList,
  EyeOff,
  FileText,
  Globe,
  GlobeLock,
  Link2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react'
import dayjs from '@/lib/dayjs'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { useIsMobile } from '@/hooks/useMobile'
import { LANGUAGE_OPTIONS } from '@/constants/languages'
import { userOptionsApi } from '@/features/posts/api'
import { categoriesApi } from '@/features/categories/api'
import type { Post, PostFilterParams } from '@/features/posts/types'
import type { TablePaginationState } from '@/lib/utils'
import type { RBACRole } from '@/shared/types'

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Trash', value: 'trash' },
]
const TYPE_OPTIONS = [
  { label: 'Normal', value: 'normal' },
  { label: 'Wordpress', value: 'wordpress' },
]
const HIDDEN_OPTIONS = [
  { label: 'Visible', value: '0' },
  { label: 'Hidden', value: '1' },
]

type ActionMeta = {
  canUpdate: boolean
  canDelete: boolean
  canPublish: boolean
  canAssignPosts: boolean
  canCreateAdsLink: boolean
  onViewRow: (row: Post) => void
  onAssignRow: (row: Post) => void
  onCreateAdsLinkRow: (row: Post) => void
  onEditRow: (row: Post) => void
  onDeleteRow: (row: Post) => void
  onToggleHidden: (row: Post) => void
  onPublishRow: (row: Post, publish: boolean) => void
  role: RBACRole
}

const TYPE_CONFIG: Record<string, { label: string; variant: 'secondary' | 'warning' | 'outline' }> =
  {
    normal: { label: 'Normal', variant: 'secondary' },
    ai: { label: 'AI', variant: 'warning' },
    wordpress: { label: 'WordPress', variant: 'outline' },
  }

function getColumns(meta: ActionMeta): MRT_ColumnDef<Post>[] {
  const {
    canUpdate,
    canDelete,
    canPublish,
    canAssignPosts,
    canCreateAdsLink,
    onEditRow,
    onAssignRow,
    onCreateAdsLinkRow,
    onDeleteRow,
    onToggleHidden,
    onPublishRow,
    role,
  } = meta

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
      accessorKey: 'feature_media',
      header: 'Image',
      size: 72,
      enableSorting: false,
      Cell: ({ row }) => {
        const media = row.original.feature_media
        if (!media)
          return (
            <div className="flex h-10 w-16 items-center justify-center rounded-md border border-dashed border-border/50 bg-muted/40">
              <FileText className="h-3.5 w-3.5 text-muted-foreground/30" />
            </div>
          )
        return (
          <img
            src={media.url}
            alt={row.original.title}
            className="h-10 w-16 rounded-md border border-border/40 object-cover shadow-sm"
          />
        )
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
      size: 240,
      Cell: ({ row }) => {
        const { title, is_hidden, slug } = row.original
        return (
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {is_hidden && (
                <EyeOff className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-label="Hidden" />
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate text-sm font-medium text-foreground leading-snug">
                      {title}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                    {title}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {slug && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate text-[11px] text-muted-foreground/60 font-mono">
                      /{slug}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs break-all text-xs">
                    /{slug}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      Cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      size: 100,
      enableSorting: false,
      Cell: ({ row }) => {
        const type = row.original.type
        if (!type) return <span className="text-muted-foreground/30 text-xs">—</span>
        const { label, variant } = TYPE_CONFIG[type] ?? { label: type, variant: 'outline' }
        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      size: 130,
      enableSorting: false,
      Cell: ({ row }) => {
        const category = row.original.category
        if (!category) return <span className="text-muted-foreground/30 text-xs">—</span>
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block px-2 py-0.5 text-[11px] font-medium text-muted-foreground max-w-full">
                  {category.name}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {category.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    ...(!role.isMember
      ? [
          {
            accessorKey: 'created_by',
            header: 'User',
            size: 90,
            enableSorting: false,
            Cell: ({ row }) => (
              <span className="text-xs text-muted-foreground">
                {row.original.created_by ?? '—'}
              </span>
            ),
          } satisfies MRT_ColumnDef<Post>,
        ]
      : []),
    {
      accessorKey: 'note',
      header: 'Note',
      size: 160,
      enableSorting: false,
      Cell: ({ row }) =>
        row.original.note ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="line-clamp-2 text-xs text-muted-foreground cursor-default">
                  {row.original.note}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {row.original.note}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground/25 text-xs">—</span>
        ),
    },
    ...(canUpdate || canDelete || canPublish || canAssignPosts || canCreateAdsLink
      ? [
          {
            id: 'actions',
            header: 'Actions',
            size: 216,
            enableSorting: false,
            enableGlobalFilter: false,
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: {
                width: 216,
                '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' },
              },
            },
            mantineTableBodyCellProps: { style: { width: 216 } },
            Cell: ({ row }: { row: { original: Post } }) => (
              <TooltipProvider>
                <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {canCreateAdsLink ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => onCreateAdsLinkRow(row.original)}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Create ads link
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {canAssignPosts ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => onAssignRow(row.original)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Assign users
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {canUpdate ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${
                              row.original.is_hidden
                                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => onToggleHidden(row.original)}
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {row.original.is_hidden ? 'Unhide' : 'Hide'}
                        </TooltipContent>
                      </Tooltip>
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
                    </>
                  ) : null}
                  {canPublish ? (
                    row.original.status === 'published' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onPublishRow(row.original, false)}
                          >
                            <GlobeLock className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Unpublish
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                            onClick={() => onPublishRow(row.original, true)}
                          >
                            <Globe className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Publish
                        </TooltipContent>
                      </Tooltip>
                    )
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
          } satisfies MRT_ColumnDef<Post>,
        ]
      : []),
  ]
}

type PostsTableCardProps = {
  data: Post[]
  rowCount: number
  loading: boolean
  pagination: TablePaginationState
  onPaginationChange: Dispatch<SetStateAction<TablePaginationState>>
  filters: PostFilterParams
  onFilterChange: (patch: Partial<PostFilterParams>) => void
  onFilterReset: () => void
  onSortingChange: (sorting: MRT_SortingState) => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canPublish: boolean
  canAssignPosts: boolean
  canCreateAdsLink: boolean
  onAddClick: () => void
  onAssignPostsClick: () => void
  onViewRow: (row: Post) => void
  onEditRow: (row: Post) => void
  onCreateAdsLinkRow: (row: Post) => void
  onAssignRow: (row: Post) => void
  onDeleteRow: (row: Post) => void
  onToggleHidden: (row: Post) => void
  onPublishRow: (row: Post, publish: boolean) => void
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
  role: RBACRole
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
  canAssignPosts,
  canCreateAdsLink,
  onAddClick,
  onAssignPostsClick,
  onViewRow,
  onEditRow,
  onCreateAdsLinkRow,
  onAssignRow,
  onDeleteRow,
  onToggleHidden,
  onPublishRow,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
  role,
}: PostsTableCardProps) {
  const isMobile = useIsMobile()
  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
  )
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
        canAssignPosts: canAssignPosts && !role.isMember,
        canCreateAdsLink,
        onViewRow,
        onAssignRow,
        onCreateAdsLinkRow,
        onEditRow,
        onDeleteRow,
        onToggleHidden,
        onPublishRow,
        role,
      }),
    [
      canUpdate,
      canDelete,
      canPublish,
      canAssignPosts,
      canCreateAdsLink,
      onViewRow,
      onAssignRow,
      onCreateAdsLinkRow,
      onEditRow,
      onDeleteRow,
      onToggleHidden,
      onPublishRow,
      role,
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
        options: STATUS_OPTIONS,
      },
      {
        field: 'type',
        label: 'Type',
        type: 'select',
        value: filters.type ?? null,
        options: TYPE_OPTIONS,
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
        hidden: role.isMember,
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
        options: HIDDEN_OPTIONS,
      },
    ],
    [filters, userOptions, categoryOptions, role],
  )

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []

    if (filters.query) {
      chips.push({ key: 'query', label: 'Search', displayValue: `"${filters.query}"` })
    }
    if (filters.status) {
      const opt = STATUS_OPTIONS.find((o) => o.value === filters.status)
      chips.push({ key: 'status', label: 'Status', displayValue: opt?.label ?? filters.status })
    }
    if (filters.type) {
      const opt = TYPE_OPTIONS.find((o) => o.value === filters.type)
      chips.push({ key: 'type', label: 'Type', displayValue: opt?.label ?? filters.type })
    }
    if (filters.lang) {
      const opt = LANGUAGE_OPTIONS.find((o) => o.value === filters.lang)
      chips.push({ key: 'lang', label: 'Language', displayValue: opt?.label ?? filters.lang })
    }
    if (filters.category_id) {
      const opt = categoryOptions.find((o) => o.value === String(filters.category_id))
      chips.push({
        key: 'category_id',
        label: 'Category',
        displayValue: opt?.label ?? String(filters.category_id),
      })
    }
    if (filters.created_by && !role.isMember) {
      const opt = userOptions.find((o) => o.value === String(filters.created_by))
      chips.push({
        key: 'created_by',
        label: 'Creator',
        displayValue: opt?.label ?? String(filters.created_by),
      })
    }
    if (filters.created_at_from || filters.created_at_to) {
      const from = filters.created_at_from
        ? dayjs(filters.created_at_from).format('MMM D, YYYY')
        : '…'
      const to = filters.created_at_to ? dayjs(filters.created_at_to).format('MMM D, YYYY') : '…'
      chips.push({ key: 'created_at', label: 'Created', displayValue: `${from} → ${to}` })
    }
    if (filters.is_hidden !== undefined && filters.is_hidden !== null) {
      const opt = HIDDEN_OPTIONS.find((o) => o.value === String(filters.is_hidden))
      chips.push({
        key: 'is_hidden',
        label: 'Visibility',
        displayValue: opt?.label ?? String(filters.is_hidden),
      })
    }

    return chips
  }, [filters, categoryOptions, userOptions, role])

  function handleRemoveChip(key: string) {
    if (key === 'created_at') {
      onFilterChange({ created_at_from: null, created_at_to: null })
    } else if (key === 'category_id') {
      onFilterChange({ category_id: null })
    } else if (key === 'created_by') {
      onFilterChange({ created_by: null })
    } else if (key === 'is_hidden') {
      onFilterChange({ is_hidden: null })
    } else {
      onFilterChange({ [key]: null } as Partial<PostFilterParams>)
    }
  }

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
      // columnPinning: { right: isMobile ? [] : ['actions'] },
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
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
        {/* Action bar */}
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-sm font-semibold text-foreground">Posts</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {rowCount.toLocaleString()}
              </span>
            </div>
            {canDelete && selectedIds.size > 0 ? (
              <>
                <div className="h-4 w-px bg-border" />
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 gap-1.5 px-2.5 text-xs font-semibold"
                  onClick={onBulkDeleteClick}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete {selectedIds.size} selected
                </Button>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            {canAssignPosts && !role.isMember ? (
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={onAssignPostsClick}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Assign Posts
              </Button>
            ) : null}
            {canCreate ? (
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={onAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Post
              </Button>
            ) : null}
            {((canAssignPosts && !role.isMember) || canCreate) && (
              <div className="h-4 w-px bg-border" />
            )}
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>

        {/* Filter panel — flush, no inner border */}
        <div className="border-t border-border/60 px-4 py-3">
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
          <FileText className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No posts found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or add a new post.
          </p>
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const PostsTableCard = memo(PostsTableCardInner)
