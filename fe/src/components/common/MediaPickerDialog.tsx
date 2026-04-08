import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
} from 'mantine-react-table'
import { AlertCircle, CheckCircle2, ImageIcon, Loader2, Pencil, Upload, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mediaApi } from '@/features/media/api'
import type { MediaFile } from '@/features/media/types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'recent' | 'upload'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number; name: string }
  | { status: 'done'; media: MediaFile }
  | { status: 'error'; message: string }

// ─────────────────────────────────────────────────────────────────────────────
// Columns (defined outside component — no deps)
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_COLUMNS: MRT_ColumnDef<MediaFile>[] = [
  {
    accessorKey: 'original_name',
    header: 'File',
    size: 200,
    Cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <img
          src={row.original.url}
          alt={row.original.original_name}
          className="size-8 shrink-0 rounded object-cover"
          loading="lazy"
        />
        <span className="truncate text-sm font-medium text-foreground">
          {row.original.original_name}
        </span>
      </div>
    ),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// RecentMediaTable — MRT with row-selection + server pagination
// ─────────────────────────────────────────────────────────────────────────────

type RecentMediaTableProps = {
  open: boolean
  selected: MediaFile | null
  onSelect: (media: MediaFile | null) => void
}

function RecentMediaTable({ open, selected, onSelect }: RecentMediaTableProps) {
  const [data, setData] = useState<MediaFile[]>([])
  const [rowCount, setRowCount] = useState(0)
  // pageIndex starts at 0; reset via key remount when dialog reopens
  const [pageIndex, setPageIndex] = useState(0)
  // Start true so the skeleton shows immediately on mount
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const doFetch = async () => {
      try {
        const res = await mediaApi.list(pageIndex + 1, 10, {
          created_from: null,
          created_to: null,
          user_id: null,
          order: null,
          order_by: null,
        })
        if (cancelled) return
        setData(res.data.data)
        setRowCount(res.data.pagination.total)
        setError(null)
      } catch {
        if (!cancelled) setError('Failed to load media.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void doFetch()
    return () => {
      cancelled = true
    }
  }, [open, pageIndex])

  const rowSelection: MRT_RowSelectionState = useMemo(
    () => (selected ? { [String(selected.id)]: true } : {}),
    [selected],
  )

  const columns = useMemo(() => MEDIA_COLUMNS, [])

  const table = useMantineReactTable({
    data,
    columns,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    enableMultiRowSelection: false,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater
      const selectedId = Object.keys(next)[0]
      if (!selectedId) {
        onSelect(null)
        return
      }
      const found = data.find((m) => String(m.id) === selectedId) ?? null
      onSelect(found)
    },
    state: {
      rowSelection,
      pagination: { pageIndex, pageSize: 10 },
      showLoadingOverlay: loading,
    },
    manualPagination: true,
    rowCount,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex, pageSize: 10 }) : updater
      setLoading(true)
      setPageIndex(next.pageIndex)
    },
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableSorting: false,
    enableColumnActions: false,
    enableFullScreenToggle: false,
    enableDensityToggle: false,
    enableHiding: false,
    enablePagination: true,
    paginationDisplayMode: 'pages',
    positionToolbarAlertBanner: 'none',
    initialState: { density: 'md' },
    mantineTableContainerProps: { sx: { maxHeight: 320, overflowY: 'auto' } },
    renderTopToolbar: () => null,
    renderEmptyRowsFallback: () =>
      error ? (
        <div className="flex items-center gap-2 p-4 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <ImageIcon className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No uploads yet</p>
        </div>
      ),
  })

  return <MantineReactTable table={table} />
}

// ─────────────────────────────────────────────────────────────────────────────
// MediaPickerDialog — raw dialog, no RHF dependency
// ─────────────────────────────────────────────────────────────────────────────

type MediaPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (media: MediaFile) => void
  title?: string
  accept?: string
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Select media',
  accept = 'image/*',
}: MediaPickerDialogProps) {
  const [tab, setTab] = useState<Tab>('recent')
  const [selected, setSelected] = useState<MediaFile | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [dragging, setDragging] = useState(false)
  // Increment on each open to remount RecentMediaTable with fresh state
  const [openKey, setOpenKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setOpenKey((k) => k + 1)
      } else {
        setTab('recent')
        setSelected(null)
        setUploadState({ status: 'idle' })
        setDragging(false)
        dragCounter.current = 0
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  const handleTabChange = useCallback((v: string) => {
    setTab(v as Tab)
  }, [])

  const handleUpload = useCallback((file: File) => {
    setUploadState({ status: 'uploading', progress: 0, name: file.name })
    mediaApi
      .upload(file, {}, (progress) => {
        setUploadState({ status: 'uploading', progress, name: file.name })
      })
      .then((res) => {
        setUploadState({ status: 'done', media: res.data.data })
      })
      .catch(() => {
        setUploadState({ status: 'error', message: 'Upload failed. Please try again.' })
      })
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file)
      e.target.value = ''
    },
    [handleUpload],
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current += 1
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current === 0) setDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleUpload(file)
    },
    [handleUpload],
  )

  const handleConfirm = useCallback(() => {
    if (tab === 'recent' && selected) {
      onSelect(selected)
      handleOpenChange(false)
    } else if (tab === 'upload' && uploadState.status === 'done') {
      onSelect(uploadState.media)
      handleOpenChange(false)
    }
  }, [tab, selected, uploadState, onSelect, handleOpenChange])

  const confirmDisabled =
    (tab === 'recent' && !selected) || (tab === 'upload' && uploadState.status !== 'done')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,720px)] w-full max-w-[min(94vw,60rem)] flex-col gap-0 p-6 sm:max-w-3xl">
        <DialogHeader className="mb-3 shrink-0">
          <DialogTitle className="text-base font-black uppercase tracking-tight">
            {title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mb-3 shrink-0 self-start">
            <TabsTrigger value="recent">Recent uploads</TabsTrigger>
            <TabsTrigger value="upload">Upload new</TabsTrigger>
          </TabsList>

          <TabsContent
            value="recent"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border"
          >
            <RecentMediaTable
              key={openKey}
              open={open && tab === 'recent'}
              selected={selected}
              onSelect={setSelected}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-0 flex min-h-0 flex-1 flex-col">
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadState.status === 'idle' || uploadState.status === 'error' ? (
              <>
                <DropZone
                  dragging={dragging}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                />
                {uploadState.status === 'error' && (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>{uploadState.message}</p>
                  </div>
                )}
              </>
            ) : uploadState.status === 'uploading' ? (
              <UploadProgress name={uploadState.name} progress={uploadState.progress} />
            ) : (
              <UploadDone
                media={uploadState.media}
                onReset={() => setUploadState({ status: 'idle' })}
              />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 shrink-0 gap-2 border-0 bg-transparent sm:justify-end">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={confirmDisabled} onClick={handleConfirm}>
            {selected && tab === 'recent' ? (
              <>
                <CheckCircle2 className="size-3.5" />
                Use this
              </>
            ) : (
              'Use this'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MediaPickerInput — controlled input trigger + preview
// ─────────────────────────────────────────────────────────────────────────────

type MediaPickerInputProps = {
  value?: MediaFile | null
  onChange?: (media: MediaFile | null) => void
  accept?: string
  placeholder?: string
  disabled?: boolean
}

export function MediaPickerInput({
  value,
  onChange,
  accept,
  placeholder = 'Pick an image…',
  disabled = false,
}: MediaPickerInputProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = useCallback(
    (media: MediaFile) => {
      onChange?.(media)
    },
    [onChange],
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange?.(null)
    },
    [onChange],
  )

  if (value) {
    return (
      <>
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-2">
          <img
            src={value.url}
            alt={value.original_name}
            className="size-12 shrink-0 rounded object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-sm font-medium">{value.original_name}</p>
            <p className="text-xs text-muted-foreground">{(value.size / 1024).toFixed(0)} KB</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={disabled}
              onClick={() => setOpen(true)}
              title="Change"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-destructive"
              disabled={disabled}
              onClick={handleClear}
              title="Remove"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
        <MediaPickerDialog
          open={open}
          onOpenChange={setOpen}
          onSelect={handleSelect}
          accept={accept}
        />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground transition-colors',
          'hover:border-primary/40 hover:bg-muted/50 hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        <ImageIcon className="size-4 shrink-0" />
        <span>{placeholder}</span>
      </button>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect}
        accept={accept}
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MediaPickerField — self-contained RHF field
// ─────────────────────────────────────────────────────────────────────────────

type MediaPickerFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  accept?: string
  placeholder?: string
}

export function MediaPickerField<T extends FieldValues>({
  control,
  name,
  label,
  accept,
  placeholder,
}: MediaPickerFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label ? <FormLabel>{label}</FormLabel> : null}
          <FormControl>
            <MediaPickerInput
              value={field.value as MediaFile | null}
              onChange={field.onChange}
              accept={accept}
              placeholder={placeholder}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal sub-components (not exported)
// ─────────────────────────────────────────────────────────────────────────────

type DropZoneProps = {
  dragging: boolean
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
}

const DropZone = ({
  dragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onClick,
}: DropZoneProps) => (
  <button
    type="button"
    onClick={onClick}
    onDragEnter={onDragEnter}
    onDragLeave={onDragLeave}
    onDragOver={onDragOver}
    onDrop={onDrop}
    className={cn(
      'flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      dragging
        ? 'border-primary bg-primary/5 text-primary'
        : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted/50',
    )}
  >
    <Upload className={cn('size-8', dragging && 'animate-bounce')} />
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm font-medium">
        {dragging ? 'Drop to upload' : 'Drag & drop or click to browse'}
      </p>
      <p className="text-xs opacity-60">PNG, JPG, GIF, WEBP up to 10 MB</p>
    </div>
  </button>
)

const UploadProgress = ({ name, progress }: { name: string; progress: number }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4">
    <Loader2 className="size-8 animate-spin text-primary" />
    <div className="w-full max-w-xs space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="max-w-[200px] truncate">{name}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  </div>
)

const UploadDone = ({ media, onReset }: { media: MediaFile; onReset: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4">
    <div className="overflow-hidden rounded-lg border border-border">
      <img src={media.url} alt={media.original_name} className="max-h-48 max-w-xs object-contain" />
    </div>
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <CheckCircle2 className="size-4 text-primary" />
        Upload successful
      </div>
      <p className="max-w-xs truncate text-xs text-muted-foreground">{media.original_name}</p>
    </div>
    <Button type="button" variant="outline" size="sm" onClick={onReset}>
      Upload another
    </Button>
  </div>
)
