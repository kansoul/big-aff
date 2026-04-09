import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle } from 'lucide-react'
import type { Style } from '@/features/styles/types'

type DeleteStyleDialogProps = {
  style: Style | null
  onOpenChange: (open: boolean) => void
  submitting: boolean
  error: string | null
  onConfirm: () => void | Promise<void>
}

export function DeleteStyleDialog({
  style,
  onOpenChange,
  submitting,
  error,
  onConfirm,
}: DeleteStyleDialogProps) {
  const open = style !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            Delete Style
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-foreground">{style?.name}</span>
          {style?.code ? (
            <>
              {' '}
              (<span className="font-mono text-xs">{style.code}</span>)
            </>
          ) : null}
          ? This action cannot be undone.
        </p>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={() => void onConfirm()}
          >
            {submitting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
