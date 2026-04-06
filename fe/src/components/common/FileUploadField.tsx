import { useCallback, useRef, useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { ImageIcon, Pencil, Upload, X, ZoomIn } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

// ─────────────────────────────────────────────────────────────────────────────
// ImagePreviewDialog — full-screen image preview
// ─────────────────────────────────────────────────────────────────────────────

function ImagePreviewDialog({
  src,
  open,
  onClose,
}: {
  src: string
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="border-none bg-transparent p-0 shadow-none sm:max-w-[90vw] md:w-auto h-auto max-h-[90vh]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <div className="flex items-center justify-center overflow-hidden rounded-md">
          <img
            src={src}
            alt="Preview"
            className="max-h-[85vh] max-w-full rounded-md object-contain shadow-2xl"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FileUploadInput — controlled drag-and-drop file input with preview
//
// Usage inside a FormField render prop, or standalone:
//
//   <FormField control={form.control} name="logo" render={({ field }) => (
//     <FormItem>
//       <FormLabel>Logo</FormLabel>
//       <FormControl>
//         <FileUploadInput value={field.value} onChange={field.onChange} accept="image/*" />
//       </FormControl>
//       <FormMessage />
//     </FormItem>
//   )} />
// ─────────────────────────────────────────────────────────────────────────────

type FileUploadInputProps = {
  value?: File | null
  onChange?: (file: File | null) => void
  accept?: string
  hint?: string
  disabled?: boolean
  previewSize?: 'sm' | 'md'
  existingUrl?: string | null
}

export function FileUploadInput({
  value,
  onChange,
  accept = 'image/*',
  hint = 'PNG, JPG, GIF, WEBP up to 10 MB',
  disabled = false,
  previewSize = 'md',
  existingUrl,
}: FileUploadInputProps) {
  const [dragging, setDragging] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      onChange?.(file)
    },
    [onChange],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile],
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
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange?.(null)
    },
    [onChange],
  )

  const imgSizeClass = previewSize === 'sm' ? 'size-10' : 'size-14'

  if (!value && existingUrl) {
    return (
      <>
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-2">
          <button
            type="button"
            className="group relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            onClick={() => setPreviewOpen(true)}
            title="Click to preview"
          >
            <img
              src={existingUrl}
              alt="Current"
              className={cn(imgSizeClass, 'rounded object-cover')}
            />
            <div className="absolute inset-0 flex items-center justify-center rounded bg-black/0 transition-colors group-hover:bg-black/40">
              <ZoomIn className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium text-foreground">Current image</p>
            <p className="text-xs text-muted-foreground">Upload a new file to replace</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            title="Change"
          >
            <Pencil className="size-3.5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <ImagePreviewDialog
          src={existingUrl}
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      </>
    )
  }

  if (value) {
    const previewUrl = value instanceof File ? URL.createObjectURL(value) : null
    const isImage = value.type.startsWith('image/')
    const sizeKb = (value.size / 1024).toFixed(0)

    return (
      <>
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-2">
          {isImage && previewUrl ? (
            <button
              type="button"
              className="group relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              onClick={() => setPreviewOpen(true)}
              title="Click to preview"
            >
              <img
                src={previewUrl}
                alt={value.name}
                className={cn(imgSizeClass, 'rounded object-cover')}
              />
              <div className="absolute inset-0 flex items-center justify-center rounded bg-black/0 transition-colors group-hover:bg-black/40">
                <ZoomIn className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>
          ) : (
            <div
              className={cn(
                imgSizeClass,
                'flex shrink-0 items-center justify-center rounded bg-muted',
              )}
            >
              <ImageIcon className="size-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="text-xs text-muted-foreground">{sizeKb} KB</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
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
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {isImage && previewUrl ? (
          <ImagePreviewDialog
            src={previewUrl}
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
          />
        ) : null}
      </>
    )
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          fileInputRef.current?.click()
        }
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        dragging
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted/50',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <Upload className={cn('size-6', dragging && 'animate-bounce')} />
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium">
          {dragging ? 'Drop to upload' : 'Drag & drop or click to browse'}
        </p>
        <p className="text-xs opacity-60">{hint}</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FileUploadField — self-contained RHF field wrapper
//
//   <FileUploadField control={form.control} name="logo" label="Logo" accept="image/*" />
// ─────────────────────────────────────────────────────────────────────────────

type FileUploadFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  accept?: string
  hint?: string
  required?: boolean
  previewSize?: 'sm' | 'md'
  existingUrl?: string | null
}

export function FileUploadField<T extends FieldValues>({
  control,
  name,
  label,
  accept,
  hint,
  required = false,
  previewSize,
  existingUrl,
}: FileUploadFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label ? (
            <FormLabel>
              {label}
              {required ? <span className="text-destructive"> *</span> : null}
            </FormLabel>
          ) : null}
          <FormControl>
            <FileUploadInput
              value={field.value as File | null}
              onChange={field.onChange}
              accept={accept}
              hint={hint}
              previewSize={previewSize}
              existingUrl={existingUrl}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
