import { memo, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { Trash2, Upload, ZoomIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog'
import type { MediaFile, MediaFilterParams } from '@/features/media/types'
import type { ManagedUser } from '@/shared/types'

type PaginationState = { pageIndex: number; pageSize: number }

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

type ColumnMeta = {
  onDeleteFile: (file: MediaFile) => void
  onPreviewClick: (file: MediaFile) => void
}

function getColumns({ onDeleteFile, onPreviewClick }: ColumnMeta): MRT_ColumnDef<MediaFile>[] {
  return [
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
        <button type="button" className="font-medium text-primary text-left truncate max-w-full">
          {row.original.original_name}
        </button>
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
    {
      accessorKey: 'user_id',
      header: 'User ID',
      size: 80,
      enableSorting: false,
      Cell: ({ row }) => <span className="text-muted-foreground">{row.original.user_id}</span>,
    },
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
    {
      id: 'actions',
      header: 'Action',
      size: 80,
      enableSorting: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { width: 80, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      mantineTableBodyCellProps: { style: { width: 80 } },
      Cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteFile(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    } satisfies MRT_ColumnDef<MediaFile>,
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
}: MediaTableCardProps) {
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)

  const columns = useMemo(
    () => getColumns({ onDeleteFile, onPreviewClick: setPreviewFile }),
    [onDeleteFile],
  )

  const sorting: MRT_SortingState = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
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
        field: 'created_from',
        label: 'From',
        type: 'datepicker',
        value: filters.created_from ?? null,
      },
      {
        field: 'created_to',
        label: 'To',
        type: 'datepicker',
        value: filters.created_to ?? null,
      },
      {
        field: 'user_id',
        label: 'User',
        type: 'select',
        value: filters.user_id != null ? String(filters.user_id) : null,
        options: users.map((u) => ({ label: u.name, value: String(u.id) })),
      },
    ],
    [filters, users],
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
      columnVisibility: { user_id: false },
      columnPinning: { right: ['actions'] },
    },
    state: { pagination, sorting, showLoadingOverlay: loading },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col gap-4 rounded-md border bg-muted/20 p-4">
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
            onClick={onUploadClick}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />
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
    renderEmptyRowsFallback: () => null,
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
