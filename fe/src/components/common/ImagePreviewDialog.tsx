import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type ImagePreviewDialogProps = {
  src?: string | null
  open: boolean
  onClose: () => void
}

export function ImagePreviewDialog({ src, open, onClose }: ImagePreviewDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent
        className="max-w-none w-screen h-screen border-none bg-transparent p-0 shadow-none flex items-center justify-center m-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        {src ? (
          <button
            type="button"
            className="flex h-full w-full items-center justify-center p-4 cursor-zoom-out outline-none relative"
            onClick={() => onClose()}
          >
            <img
              src={src}
              alt="Preview"
              className="max-h-[90vh] max-w-[95vw] object-contain drop-shadow-2xl"
            />
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
