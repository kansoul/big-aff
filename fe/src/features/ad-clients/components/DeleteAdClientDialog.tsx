import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { adClientsApi } from '@/features/ad-clients/api'
import { formatApiError } from '@/features/settings/components'
import type { AdClient } from '@/features/ad-clients/types'
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

type DeleteAdClientDialogProps = {
  adClient: AdClient | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteAdClientDialog({
  adClient,
  onOpenChange,
  onSuccess,
}: DeleteAdClientDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const onConfirm = async () => {
    if (!adClient) {
      return
    }

    try {
      setDeleting(true)
      await adClientsApi.remove(adClient.id)
      toast.success('Ad client deleted successfully')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!adClient} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Ad Client</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{adClient?.ad_client_id}</span>? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={deleting} onClick={() => void onConfirm()}>
            {deleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Deleting...
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
