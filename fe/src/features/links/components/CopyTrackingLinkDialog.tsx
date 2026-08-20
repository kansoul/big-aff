import { useMemo, useState } from 'react'
import { Check, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { Link } from '@/features/links/types'
import { buildTrackingLink, type LinkPlatform } from '@/lib/link'

export type CopyTrackingLinkTarget = {
  link: Link
  platform: LinkPlatform
}

type CopyTrackingLinkDialogProps = {
  target: CopyTrackingLinkTarget | null
  onOpenChange: (open: boolean) => void
}

const PLATFORM_LABELS: Record<LinkPlatform, string> = {
  facebook: 'Facebook',
  google: 'Google',
  tiktok: 'TikTok',
}

export function CopyTrackingLinkDialog({ target, onOpenChange }: CopyTrackingLinkDialogProps) {
  const [copying, setCopying] = useState(false)
  const trackingLink = useMemo(
    () =>
      target ? buildTrackingLink(target.link.url, target.link.tracking_code, target.platform) : '',
    [target],
  )

  async function handleCopy() {
    if (!trackingLink) return
    setCopying(true)
    try {
      await navigator.clipboard.writeText(trackingLink)
      toast.success(`${target ? PLATFORM_LABELS[target.platform] : ''} tracking link copied`)
      onOpenChange(false)
    } catch {
      toast.error('Unable to copy the tracking link')
    } finally {
      setCopying(false)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirm tracking link</DialogTitle>
          <DialogDescription>
            Review the generated URL below before copying it to your clipboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{target?.link.name}</span>
            {target ? <Badge variant="secondary">{PLATFORM_LABELS[target.platform]}</Badge> : null}
          </div>
          <Textarea
            readOnly
            rows={5}
            value={trackingLink}
            className="min-h-28 resize-none break-all font-mono text-xs leading-relaxed"
            aria-label="Generated tracking link"
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 text-emerald-500" />
            Existing URL parameters are preserved and tracking parameters are updated.
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!trackingLink || copying}
            onClick={() => void handleCopy()}
          >
            {copying ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
            Copy link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
