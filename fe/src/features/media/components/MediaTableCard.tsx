import { memo, useMemo, type Dispatch, type SetStateAction } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { AlertCircle, Images, Trash2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  onFileClick: (file: MediaFile) => void
  onDeleteFile: (file: MediaFile) => void
}

function getColumns({ onFileClick, onDeleteFile }: ColumnMeta): MRT_ColumnDef<MediaFile>[] {
  return [
    {
      accessorKey: 'original_name',
      header: 'File Name',
      size: 200,
      Cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onFileClick(row.original)}
          className="font-medium text-primary underline underline-offset-2 hover:opacity-80 text-left truncate max-w-full"
        >
          {row.original.original_name}
        </button>
      ),
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
  listError: string | null
  pagination: PaginationState
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>
  filters: MediaFilterParams
  onFilterChange: (field: keyof MediaFilterParams, value: string | number | null) => void
  onSortingChange: (sorting: MRT_SortingState) => void
  users: ManagedUser[]
  onUploadClick: () => void
  onFileClick: (file: MediaFile) => void
  onDeleteFile: (file: MediaFile) => void
}

function MediaTableCardInner({
  data,
  rowCount,
  loading,
  listError,
  pagination,
  onPaginationChange,
  filters,
  onFilterChange,
  onSortingChange,
  users,
  onUploadClick,
  onFileClick,
  onDeleteFile,
}: MediaTableCardProps) {
  const columns = useMemo(
    () => getColumns({ onFileClick, onDeleteFile }),
    [onFileClick, onDeleteFile],
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
    initialState: {
      density: 'md',
      columnVisibility: { user_id: false },
    },
    state: { pagination, isLoading: loading, sorting },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbarCustomActions: () => (
      <div className="flex flex-wrap items-end gap-3 py-1 w-full">
        {listError ? (
          <div className="flex w-full items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <p>{listError}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <DatePicker
            value={filters.created_from ?? null}
            onChange={(v) => onFilterChange('created_from', v)}
            placeholder="Start date"
            className="w-32"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <DatePicker
            value={filters.created_to ?? null}
            onChange={(v) => onFilterChange('created_to', v)}
            placeholder="End date"
            className="w-32"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">User</Label>
          <Select
            value={filters.user_id != null ? String(filters.user_id) : '__all__'}
            onValueChange={(v) =>
              onFilterChange('user_id', v === '__all__' ? null : parseInt(v, 10))
            }
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    ),
    renderToolbarInternalActions: ({ table: t }) => (
      <div className="flex items-center gap-1">
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
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <Images className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No files found.</p>
      </div>
    ),
  })

  return (
    <>
      <Card className="mt-4 overflow-hidden border-border shadow-none">
        <CardContent className="p-0">
          <MantineReactTable table={table} />
        </CardContent>
      </Card>
    </>
  )
}

export const MediaTableCard = memo(MediaTableCardInner)
