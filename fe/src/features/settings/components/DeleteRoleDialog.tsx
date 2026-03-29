import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Role } from '@/shared/types'

import { RoleFormErrorAlert } from './RoleFormErrorAlert'

type DeleteRoleDialogProps = {
  role: Role | null
  onOpenChange: (open: boolean) => void
  formError: string | null
  deleting: boolean
  onConfirmDelete: () => void | Promise<void>
}

export function DeleteRoleDialog({
  role,
  onOpenChange,
  formError,
  deleting,
  onConfirmDelete,
}: DeleteRoleDialogProps) {
  return (
    <Dialog open={!!role} onOpenChange={onOpenChange}>
      <DialogContent className=" sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            Delete role
          </DialogTitle>
          <DialogDescription>
            This removes the role <span className="font-medium text-foreground">{role?.name}</span>.
            Users must not use this role anymore.
          </DialogDescription>
        </DialogHeader>
        {formError && role ? <RoleFormErrorAlert message={formError} /> : null}
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
