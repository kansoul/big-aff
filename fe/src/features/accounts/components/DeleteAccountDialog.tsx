import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { accountsApi } from '@/features/accounts/api'
import { formatApiError } from '@/features/settings/components'
import type { Account } from '@/features/accounts/types'
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

type DeleteAccountDialogProps = {
  account: Account | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteAccountDialog({
  account,
  onOpenChange,
  onSuccess,
}: DeleteAccountDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const onConfirm = async () => {
    if (!account) {
      return
    }

    try {
      setDeleting(true)
      await accountsApi.remove(account.id)
      toast.success('Account deleted successfully')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!account} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{account?.account_id}</span>? This action
            cannot be undone.
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
