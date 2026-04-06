import { Loader2, Trash2 } from 'lucide-react'

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
import { RoleFormErrorAlert } from '@/features/settings/components/RoleFormErrorAlert'
import type { ManagedUser } from '@/shared/types'

type DeleteUserDialogProps = {
  userRow: ManagedUser | null
  onOpenChange: (open: boolean) => void
  formError: string | null
  deleting: boolean
  onConfirmDelete: () => void | Promise<void>
}

export function DeleteUserDialog({
  userRow,
  onOpenChange,
  formError,
  deleting,
  onConfirmDelete,
}: DeleteUserDialogProps) {
  return (
    <AlertDialog open={!!userRow} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete user</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{userRow?.name}</span> ({userRow?.email})?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {formError && userRow ? <RoleFormErrorAlert message={formError} /> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void onConfirmDelete()}
          >
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
