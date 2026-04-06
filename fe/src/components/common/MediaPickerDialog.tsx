import { useCallback, useEffect, useRef, useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
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
  const [recent, setRecent] = useState<MediaFile[]>([])
  // Start as true so the loading state shows immediately on first open
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [recentError, setRecentError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [selected, setSelected] = useState<MediaFile | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  // Wrap onOpenChange to reset all state without touching a useEffect.
  // setState inside event handlers is always fine — no cascading renders.
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setTab('recent')
        setSelected(null)
        setUploadState({ status: 'idle' })
        setDragging(false)
        setRecent([])
        setRecentError(null)
        setLoadingRecent(true) // prime for next open
        setPage(1)
        setHasMore(false)
        dragCounter.current = 0
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  // When the user switches to the Recent tab, prime loading state via handler.
  const handleTabChange = useCallback((v: string) => {
    const next = v as Tab
    setTab(next)
    if (next === 'recent') {
      setRecent([])
      setRecentError(null)
      setLoadingRecent(true)
      setPage(1)
      setHasMore(false)
    }
  }, [])

  // Fetch recent media. All setState calls live inside the async callbacks,
  // never synchronously in the effect body (satisfies react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!open || tab !== 'recent') return
    let cancelled = false

    const fetchRecent = async () => {
      try {
        const res = await mediaApi.list(1, 24, {
          created_from: null,
          created_to: null,
          user_id: null,
          order: null,
          order_by: null,
        })
        if (cancelled) return
        setRecent(res.data.data)
        setPage(1)
        setHasMore(res.data.pagination.current_page < res.data.pagination.last_page)
        setRecentError(null)
      } catch {
        if (!cancelled) setRecentError('Failed to load recent media.')
      } finally {
        if (!cancelled) setLoadingRecent(false)
      }
    }

    void fetchRecent()
    return () => {
      cancelled = true
    }
  }, [open, tab])

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setLoadingRecent(true)
    mediaApi
      .list(nextPage, 24, {
        created_from: null,
        created_to: null,
        user_id: null,
        order: null,
        order_by: null,
      })
      .then((res) => {
        setRecent((prev) => [...prev, ...res.data.data])
        setPage(nextPage)
        setHasMore(res.data.pagination.current_page < res.data.pagination.last_page)
      })
      .catch(() => setRecentError('Failed to load more media.'))
      .finally(() => setLoadingRecent(false))
  }, [page])

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
      <DialogContent className="flex max-h-[min(92vh,680px)] w-full max-w-[min(94vw,56rem)] flex-col gap-0 p-6 sm:max-w-2xl">
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

          <TabsContent value="recent" className="mt-0 flex min-h-0 flex-1 flex-col gap-3">
            {loadingRecent && recent.length === 0 ? (
              <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-14 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading…</span>
              </div>
            ) : recentError ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <p>{recentError}</p>
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-14 text-center">
                <ImageIcon className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No uploads yet</p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {recent.map((media) => (
                    <MediaTile
                      key={media.id}
                      media={media}
                      selected={selected?.id === media.id}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center pb-1">
                    <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingRecent}>
                      {loadingRecent ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Loading…
                        </>
                      ) : (
                        'Load more'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
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
            Use this
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MediaPickerInput — controlled input trigger + preview
// Use inside a FormField render prop, or standalone with value/onChange.
//
//   <FormField control={form.control} name="avatar" render={({ field }) => (
//     <FormItem>
//       <FormLabel>Avatar</FormLabel>
//       <FormControl>
//         <MediaPickerInput value={field.value} onChange={field.onChange} />
//       </FormControl>
//       <FormMessage />
//     </FormItem>
//   )} />
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
// Pass control + name; renders label, input trigger, and validation message.
//
//   <MediaPickerField control={form.control} name="avatar" label="Avatar" />
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

const MediaTile = ({
  media,
  selected,
  onSelect,
}: {
  media: MediaFile
  selected: boolean
  onSelect: (m: MediaFile) => void
}) => (
  <button
    type="button"
    onClick={() => onSelect(media)}
    className={cn(
      'group relative aspect-square overflow-hidden rounded-md border bg-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      selected ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50',
    )}
  >
    <img
      src={media.url}
      alt={media.original_name}
      className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
      loading="lazy"
    />
    {selected && (
      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
        <CheckCircle2 className="size-5 text-primary drop-shadow" />
      </div>
    )}
  </button>
)

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
