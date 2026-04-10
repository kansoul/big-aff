import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { followsApi } from '@/features/follows/api'
import { formatApiError } from '@/features/settings/components'
import type { Follow } from '@/features/follows/types'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

type DeleteFollowDialogProps = {
  follow: Follow | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteFollowDialog({ follow, onOpenChange, onSuccess }: DeleteFollowDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const onConfirm = async () => {
    if (!follow) return
    try {
      setDeleting(true)
      await followsApi.remove(follow.id)
      toast.success('Follow deleted successfully')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!follow} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Follow</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the follow for{' '}
            <span className="font-medium text-foreground">{follow?.email}</span>? This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={deleting} onClick={() => void onConfirm()}>
            {deleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                Delete
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
