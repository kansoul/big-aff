import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog'
import { RoleFormErrorAlert } from '@/features/settings/components/RoleFormErrorAlert'
import type { MediaFile } from '@/features/media/types'

type FileDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  error: string | null
  file: MediaFile | null
}

export function FileDetailDialog({
  open,
  onOpenChange,
  loading,
  error,
  file,
}: FileDetailDialogProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const isImage = file?.mime_type?.startsWith('image/')

  return (
    <>
      <ImagePreviewDialog
        src={file?.url}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setLightboxOpen(false)
          onOpenChange(next)
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[min(92vh,700px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black tracking-tight uppercase text-base truncate pr-6">
              {file?.original_name ?? 'File Detail'}
            </DialogTitle>
          </DialogHeader>

          {error ? <RoleFormErrorAlert message={error} /> : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40 min-h-32">
                {isImage ? (
                  <img
                    src={file.url}
                    alt={file.alt_text || file.original_name}
                    className="max-h-72 w-auto object-contain cursor-zoom-in"
                    onClick={() => setLightboxOpen(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                    <FileText className="h-10 w-10 opacity-30" />
                    <span className="text-xs">{file.mime_type}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
