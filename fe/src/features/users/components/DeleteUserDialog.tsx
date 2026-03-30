import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
    <Dialog open={!!userRow} onOpenChange={onOpenChange}>
      <DialogContent className=" sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            Delete user
          </DialogTitle>
          <DialogDescription>
            This removes the account{' '}
            <span className="font-medium text-foreground">{userRow?.name}</span> ({userRow?.email}
            ). Child users will keep existing data but their parent link may be cleared depending on
            server rules.
          </DialogDescription>
        </DialogHeader>
        {formError && userRow ? <RoleFormErrorAlert message={formError} /> : null}
        <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end gap-2">
          <Button type="button" variant="outline" className="" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className=""
            disabled={deleting}
            onClick={() => void onConfirmDelete()}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
