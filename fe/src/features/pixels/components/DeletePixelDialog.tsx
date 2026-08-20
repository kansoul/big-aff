import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { pixelsApi } from '@/features/pixels/api'
import type { Pixel } from '@/features/pixels/types'
import { formatApiError } from '@/features/settings/components'

type DeletePixelDialogProps = {
  pixel: Pixel | null
  onOpenChange: (pixel: Pixel | null) => void
  onSuccess: () => void
}

export function DeletePixelDialog({ pixel, onOpenChange, onSuccess }: DeletePixelDialogProps) {
  const [deleting, setDeleting] = useState(false)
  async function handleDelete() {
    if (!pixel) return
    setDeleting(true)
    try {
      await pixelsApi.delete(pixel.id)
      toast.success('Pixel Conversion deleted')
      onOpenChange(null)
      onSuccess()
    } catch (error) {
      toast.error(formatApiError(error))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={pixel !== null} onOpenChange={(open) => !open && onOpenChange(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Pixel Conversion</DialogTitle>
          <DialogDescription>
            Delete <span className="font-medium text-foreground">{pixel?.pixel_id}</span>? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={deleting} onClick={() => onOpenChange(null)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
            {deleting ? 'Deleting…' : 'Delete Pixel Conversion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
