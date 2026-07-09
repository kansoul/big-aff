import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CopyDialogState } from '@/features/ads-links/types'
import { copyToClipboard } from '@/helpers'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

type CopyLinkDialogProps = {
  state: CopyDialogState
  onClose: () => void
}

export function CopyLinkDialog({ state, onClose }: CopyLinkDialogProps) {
  const PLATFORM_LABELS: Record<CopyDialogState['platform'], string> = {
    facebook: 'Facebook',
    google: 'Google',
    tiktok: 'TikTok',
  }
  const label = PLATFORM_LABELS[state.platform]

  async function handleCopy() {
    await copyToClipboard(state.link)
    onClose()
    toast.success(`Đã copy link ${label} thành công!`)
  }

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy link {label}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{label} ID</label>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-xs">
              <span className="flex-1 break-all">{state.id}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Link cho {label}</label>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-xs">
              <span className="flex-1 break-all">{state.link}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleCopy()}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
