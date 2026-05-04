import { memo, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { Trash2, Upload, ZoomIn } from 'lucide-react'

import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog'
import { useIsMobile } from '@/hooks/useMobile'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import type { MediaFile, MediaFilterParams } from '@/features/media/types'
import type { ManagedUser, RBACRole } from '@/shared/types'

type PaginationState = { pageIndex: number; pageSize: number }

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

type ColumnMeta = {
  canDelete: boolean
  onDeleteFile: (file: MediaFile) => void
  onPreviewClick: (file: MediaFile) => void
  role: RBACRole
}

function getColumns({
  canDelete,
  onDeleteFile,
  onPreviewClick,
  role,
}: ColumnMeta): MRT_ColumnDef<MediaFile>[] {
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
      id: 'preview',
      header: 'Preview',
      size: 72,
      enableSorting: false,
      enableHiding: true,
      Cell: ({ row }) => {
        const file = row.original
        const isImage = file.mime_type?.startsWith('image/')
        if (!isImage || !file.url) {
          return <span className="text-muted-foreground/50">—</span>
        }
        return (
          <button
            type="button"
            onClick={() => onPreviewClick(file)}
            className="group relative h-10 w-10 overflow-hidden rounded-md border border-border bg-muted shrink-0"
          >
            <img
              src={file.url}
              alt={file.alt_text || file.original_name}
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-4 w-4 text-white" />
            </span>
          </button>
        )
      },
    } satisfies MRT_ColumnDef<MediaFile>,
    {
      accessorKey: 'original_name',
      header: 'File Name',
      size: 200,
      Cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="truncate block font-medium text-primary text-left max-w-full"
              >
                {row.original.original_name}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
              {row.original.original_name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'alt_text',
      header: 'Alt Text',
      size: 150,
      enableSorting: false,
      Cell: ({ row }) => {
        const alt = row.original.alt_text
        if (!alt) return <span className="text-muted-foreground/50">—</span>
        return (
          <span className="text-muted-foreground truncate max-w-full block" title={alt}>
            {alt}
          </span>
        )
      },
    },
    {
      accessorKey: 'mime_type',
      header: 'Type',
      size: 120,
      enableSorting: false,
      Cell: ({ row }) => {
        const type = row.original.mime_type
        if (!type) return <span className="text-muted-foreground/50">—</span>
        return (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
            {type}
          </span>
        )
      },
    },
    {
      accessorKey: 'size',
      header: 'Size',
      size: 90,
      Cell: ({ row }) => (
        <span className="text-muted-foreground">{formatBytes(row.original.size)}</span>
      ),
    },
    ...(!role.isMember
      ? [
          {
            accessorKey: 'user_id',
            header: 'User ID',
            size: 80,
            enableSorting: false,
            Cell: ({ row }) => (
              <span className="text-muted-foreground">{row.original.user_id}</span>
            ),
          } satisfies MRT_ColumnDef<MediaFile>,
        ]
      : []),
    {
      accessorKey: 'created_at',
      header: 'Uploaded',
      size: 140,
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
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: { width: 90, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
            },
            mantineTableBodyCellProps: { style: { width: 90 } },
            Cell: ({ row }: { row: { original: MediaFile } }) => (
              <TooltipProvider>
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Delete ${row.original.original_name}`}
                        onClick={() => onDeleteFile(row.original)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Delete
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            ),
          } satisfies MRT_ColumnDef<MediaFile>,
        ]
      : []),
  ]
}

type MediaTableCardProps = {
  data: MediaFile[]
  rowCount: number
  loading: boolean
  pagination: PaginationState
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>
  filters: MediaFilterParams
  onFilterChange: (patch: Partial<MediaFilterParams>) => void
  onFilterReset: () => void
  onSortingChange: (sorting: MRT_SortingState) => void
  users: ManagedUser[]
  onUploadClick: () => void
  onDeleteFile: (file: MediaFile) => void
  canDelete: boolean
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
  role: RBACRole
}

function MediaTableCardInner({
  data,
  rowCount,
  loading,
  pagination,
  onPaginationChange,
  filters,
  onFilterChange,
  onFilterReset,
  onSortingChange,
  users,
  onUploadClick,
  onDeleteFile,
  canDelete,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
  role,
}: MediaTableCardProps) {
  const isMobile = useIsMobile()
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
    { user_id: false },
  )

  const columns = useMemo(
    () => getColumns({ canDelete, onDeleteFile, onPreviewClick: setPreviewFile, role }),
    [canDelete, onDeleteFile, role],
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
        field: 'alt_text',
        label: 'Alt Text',
        type: 'input',
        value: filters.alt_text ?? null,
      },
      {
        field: 'created_at',
        label: 'Uploaded',
        type: 'daterange',
        value:
          filters.created_from || filters.created_to
            ? { from: filters.created_from, to: filters.created_to }
            : null,
      },
      {
        field: 'user_id',
        label: 'User',
        type: 'select',
        hidden: role.isMember,
        value: filters.user_id != null ? String(filters.user_id) : null,
        options: users.map((u) => ({ label: u.name, value: String(u.id) })),
      },
    ],
    [filters, users, role],
  )

  function handleApply(values: Record<string, unknown>) {
    const dateRange = values.created_at as DateRangeValue | null
    onFilterChange({
      alt_text: (values.alt_text as string | null) ?? null,
      created_from: dateRange?.from ?? null,
      created_to: dateRange?.to ?? null,
      user_id: values.user_id != null ? Number(values.user_id) : null,
    })
  }

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []

    if (filters.alt_text) {
      chips.push({ key: 'alt_text', label: 'Alt Text', displayValue: `"${filters.alt_text}"` })
    }
    if (filters.created_from || filters.created_to) {
      chips.push({
        key: 'created_at',
        label: 'Uploaded',
        displayValue: `${filters.created_from ?? '…'} -> ${filters.created_to ?? '…'}`,
      })
    }
    if (filters.user_id != null) {
      const opt = users.find((user) => user.id === filters.user_id)
      chips.push({
        key: 'user_id',
        label: 'User',
        displayValue: opt?.name ?? String(filters.user_id),
      })
    }

    return chips
  }, [filters, users])

  function handleRemoveChip(key: string) {
    if (key === 'created_at') {
      onFilterChange({ created_from: null, created_to: null })
    } else if (key === 'user_id') {
      onFilterChange({ user_id: null })
    } else {
      onFilterChange({ [key]: null } as Partial<MediaFilterParams>)
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
      columnPinning: { right: isMobile ? [] : ['actions'] },
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
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Upload className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Media</span>
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
            <Button
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs font-medium"
              onClick={onUploadClick}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
            <div className="h-4 w-px bg-border" />
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <FilterPanel
            fields={filterFields}
            onReset={onFilterReset}
            applyMode
            onApply={handleApply}
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
          <Upload className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No media files found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or upload new files.
          </p>
        </div>
      </div>
    ),
  })

  return (
    <>
      <MantineReactTable table={table} />
      <ImagePreviewDialog
        src={previewFile?.url ?? null}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </>
  )
}

export const MediaTableCard = memo(MediaTableCardInner)
