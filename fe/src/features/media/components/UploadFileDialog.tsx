import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import { RoleFormErrorAlert } from '@/features/settings/components/RoleFormErrorAlert'

const DIRECTORY_OPTIONS = ['media', 'media/site', 'media/posts'] as const

const uploadFormSchema = z.object({
  directory: z.enum(DIRECTORY_OPTIONS).or(z.literal('')).optional(),
  alt_text: z.string().max(255, 'Max 255 characters').optional().or(z.literal('')),
})

type UploadFormValues = z.infer<typeof uploadFormSchema>

const USER_DEFAULT_DIRECTORY = 'media/posts'

type UploadFileDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formError: string | null
  uploadProgress: number
  submitting: boolean
  isAdmin?: boolean
  onSubmit: (
    file: File,
    options: { directory?: 'media' | 'media/site' | 'media/posts'; alt_text?: string | null },
  ) => Promise<void>
}

export function UploadFileDialog({
  open,
  onOpenChange,
  formError,
  uploadProgress,
  submitting,
  isAdmin = false,
  onSubmit,
}: UploadFileDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: { directory: '', alt_text: '' },
  })

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && submitting) return
      if (!next) {
        form.reset({ directory: '', alt_text: '' })
        setSelectedFile(null)
        setFileError(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      onOpenChange(next)
    },
    [form, onOpenChange, submitting],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setFileError(null)
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (values: UploadFormValues) => {
    if (!selectedFile) {
      setFileError('Please select a file')
      return
    }
    try {
      await onSubmit(selectedFile, {
        directory: isAdmin ? values.directory || 'media' : USER_DEFAULT_DIRECTORY,
        alt_text: values.alt_text || null,
      })
      // Reset local state on success before dialog closes
      form.reset({ directory: '', alt_text: '' })
      setSelectedFile(null)
      setFileError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      // Error is handled by parent via formError prop — keep form state so user can retry
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[min(92vh,640px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            Upload File
          </DialogTitle>
        </DialogHeader>

        {formError && open ? <RoleFormErrorAlert message={formError} className="shrink-0" /> : null}

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(handleSubmit)(e)
            }}
            className="space-y-4"
          >
            {/* File picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">
                File <span className="text-destructive">*</span>
              </label>
              {selectedFile ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                  <span className="flex-1 truncate text-foreground">{selectedFile.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFile}
                    className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                    aria-label="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              ) : (
                <Input
                  ref={fileInputRef}
                  type="file"
                  className="cursor-pointer"
                  onChange={handleFileChange}
                />
              )}
              {fileError ? <p className="text-xs text-destructive">{fileError}</p> : null}
            </div>

            {/* Upload progress */}
            {submitting && uploadProgress > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {isAdmin && (
              <FormField
                control={form.control}
                name="directory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Directory</FormLabel>
                    <SearchableSelect
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      options={[
                        { label: 'Default (media)', value: '' },
                        ...DIRECTORY_OPTIONS.map((dir) => ({ label: dir, value: dir })),
                      ]}
                      placeholder="Default (media)"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="alt_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Describe the file…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-2 shrink-0 gap-2 border-0 bg-transparent sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
