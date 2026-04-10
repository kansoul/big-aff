import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
} from 'mantine-react-table'
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Pencil,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { mediaApi } from '@/features/media/api'
import type { MediaFile } from '@/features/media/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImagePreviewDialog } from './ImagePreviewDialog'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'recent' | 'upload'

type UploadState =
  | { status: 'idle' }
  | { status: 'selected'; file: File; previewUrl: string }
  | { status: 'error'; message: string }

function MediaFileCell({ media }: { media: MediaFile }) {
  const [preview, setPreview] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="group relative size-8 shrink-0 overflow-hidden rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(e) => {
            e.stopPropagation()
            setPreview(true)
          }}
          title="Preview"
        >
          <img
            src={media.url}
            alt={media.alt_text || media.original_name}
            className="size-8 object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIn className="size-3.5 text-white" />
          </div>
        </button>
        <span className="truncate text-sm font-medium text-foreground">{media.original_name}</span>
      </div>

      <ImagePreviewDialog src={media.url} open={preview} onClose={() => setPreview(false)} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Columns (defined outside component — no deps)
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_COLUMNS: MRT_ColumnDef<MediaFile>[] = [
  {
    accessorKey: 'original_name',
    header: 'File',
    size: 200,
    Cell: ({ row }) => <MediaFileCell media={row.original} />,
  },
  {
    accessorKey: 'alt_text',
    header: 'Name',
    size: 140,
    Cell: ({ row }) => (
      <span className="max-w-xs truncate text-sm text-muted-foreground">
        {row.original.alt_text}
      </span>
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
  directory: 'media' | 'media/site' | 'media/posts'
}

function RecentMediaTable({ open, selected, onSelect }: RecentMediaTableProps) {
  const [data, setData] = useState<MediaFile[]>([])
  const [rowCount, setRowCount] = useState(0)
  // pageIndex starts at 0; reset via key remount when dialog reopens
  const [pageIndex, setPageIndex] = useState(0)
  // Start true so the skeleton shows immediately on mount
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [altTextSearch, setAltTextSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(altTextSearch)
      setPageIndex(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [altTextSearch])

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
          alt_text: debouncedSearch || null,
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
  }, [open, pageIndex, debouncedSearch])

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
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: row.getToggleSelectedHandler(),
      sx: { cursor: 'pointer' },
    }),
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
    mantineBottomToolbarProps: { sx: { '& .mantine-Select-root': { display: 'none' } } },
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

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={altTextSearch}
            onChange={(e) => setAltTextSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
      <MantineReactTable table={table} />
    </div>
  )
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
  directory: 'media' | 'media/site' | 'media/posts'
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Select media',
  accept = 'image/*',
  directory = 'media',
}: MediaPickerDialogProps) {
  const [tab, setTab] = useState<Tab>('recent')
  const [selected, setSelected] = useState<MediaFile | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [uploading, setUploading] = useState(false)
  const [altText, setAltText] = useState('')
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
        setUploadState((prev) => {
          if (prev.status === 'selected') URL.revokeObjectURL(prev.previewUrl)
          return { status: 'idle' }
        })
        setAltText('')
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

  const handleFileSelect = useCallback((file: File) => {
    setUploadState((prev) => {
      if (prev.status === 'selected') URL.revokeObjectURL(prev.previewUrl)
      return { status: 'selected', file, previewUrl: URL.createObjectURL(file) }
    })
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
      e.target.value = ''
    },
    [handleFileSelect],
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
      if (file) handleFileSelect(file)
    },
    [handleFileSelect],
  )

  const handleConfirm = useCallback(async () => {
    if (tab === 'recent' && selected) {
      onSelect(selected)
      handleOpenChange(false)
    } else if (tab === 'upload' && uploadState.status === 'selected') {
      try {
        setUploading(true)
        const res = await mediaApi.upload(uploadState.file, {
          alt_text: altText.trim() || null,
          directory: directory || null,
        })
        onSelect(res.data.data)
        handleOpenChange(false)
      } catch {
        setUploadState({ status: 'error', message: 'Upload failed. Please try again.' })
      } finally {
        setUploading(false)
      }
    }
  }, [tab, selected, uploadState, altText, directory, onSelect, handleOpenChange])

  const confirmDisabled =
    uploading ||
    (tab === 'recent' && !selected) ||
    (tab === 'upload' && uploadState.status !== 'selected')

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
              directory={directory}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-0 flex min-h-0 flex-1 flex-col gap-4">
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
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>{uploadState.message}</p>
                  </div>
                )}
              </>
            ) : (
              <FileSelected
                file={uploadState.file}
                previewUrl={uploadState.previewUrl}
                onReset={() =>
                  setUploadState((prev) => {
                    if (prev.status === 'selected') URL.revokeObjectURL(prev.previewUrl)
                    return { status: 'idle' }
                  })
                }
              />
            )}

            {/* Upload metadata fields */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="upload-alt-text">Alt text</Label>
                <Input
                  id="upload-alt-text"
                  placeholder="Describe the file…"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  maxLength={255}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 shrink-0 gap-2 border-0 bg-transparent sm:justify-end">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={confirmDisabled} onClick={() => void handleConfirm()}>
            {uploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Uploading…
              </>
            ) : selected && tab === 'recent' ? (
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
  directory: 'media' | 'media/site' | 'media/posts'
}

export function MediaPickerInput({
  value,
  onChange,
  accept,
  placeholder = 'Pick an image…',
  disabled = false,
  directory = 'media',
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
          {value.url ? (
            <img
              src={value.url}
              alt={value.original_name ?? ''}
              className="size-12 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="size-12 shrink-0 rounded bg-muted" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-sm font-medium">{value.original_name}</p>
            <div className="flex items-center gap-2">
              {value.size != null && (
                <p className="text-xs text-muted-foreground">{(value.size / 1024).toFixed(0)} KB</p>
              )}
            </div>
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
          directory={directory}
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
        directory={directory}
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
  directory: 'media' | 'media/site' | 'media/posts'
}

export function MediaPickerField<T extends FieldValues>({
  control,
  name,
  label,
  accept,
  placeholder,
  directory,
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
              directory={directory}
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
      'flex flex-1 cursor-pointer flex-col items-center justify-center py-4 gap-3 rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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

const FileSelected = ({
  file,
  previewUrl,
  onReset,
}: {
  file: File
  previewUrl: string
  onReset: () => void
}) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4">
    <div className="overflow-hidden rounded-lg border border-border">
      <img src={previewUrl} alt={file.name} className="max-h-48 max-w-xs object-contain" />
    </div>
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="max-w-xs truncate text-sm font-medium text-foreground">{file.name}</p>
      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
    </div>
    <Button type="button" variant="outline" size="sm" onClick={onReset}>
      Choose different file
    </Button>
  </div>
)
