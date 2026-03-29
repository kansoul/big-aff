import type { Dispatch, SetStateAction } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { Role } from '@/shared/types'

import { PermissionCollapsibleTree } from './PermissionCollapsibleTree'
import { RoleFormErrorAlert } from './RoleFormErrorAlert'
import type { RoleNameFormValues } from '@/features/settings/types'

type EditRoleDialogProps = {
  role: Role | null
  onOpenChange: (open: boolean) => void
  canUpdate: boolean
  canAssign: boolean
  formError: string | null
  editForm: UseFormReturn<RoleNameFormValues>
  selectedPermissionMask: number
  setSelectedPermissionMask: Dispatch<SetStateAction<number>>
  submitting: boolean
  onSubmit: (values: RoleNameFormValues) => void | Promise<void>
}

export function EditRoleDialog({
  role,
  onOpenChange,
  canUpdate,
  canAssign,
  formError,
  editForm,
  selectedPermissionMask,
  setSelectedPermissionMask,
  submitting,
  onSubmit,
}: EditRoleDialogProps) {
  return (
    <Dialog open={!!role} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,720px)] w-full max-w-[min(94vw,48rem)] flex-col gap-0 p-6 sm:max-w-3xl">
        <DialogHeader className="mb-1 shrink-0">
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            Edit role
          </DialogTitle>
        </DialogHeader>
        {formError && role ? <RoleFormErrorAlert message={formError} className="shrink-0" /> : null}
        <Form {...editForm}>
          <form
            onSubmit={(e) => {
              void editForm.handleSubmit(onSubmit)(e)
            }}
            className="flex min-h-0 flex-1 flex-col gap-3"
          >
            <FormField
              control={editForm.control}
              name="name"
              render={({ field }) => (
                <FormItem className="shrink-0">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" disabled={!canUpdate} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canAssign ? (
              <div className="flex min-h-0 flex-1 flex-col gap-1">
                <FormLabel className="text-foreground">Permissions</FormLabel>
                <div className="min-h-[min(50vh,380px)] max-h-[min(58vh,440px)] flex-1 overflow-y-auto rounded-md border border-border px-3 py-2">
                  <PermissionCollapsibleTree
                    mask={selectedPermissionMask}
                    setMask={setSelectedPermissionMask}
                  />
                </div>
              </div>
            ) : null}
            <DialogFooter className="mt-2 shrink-0 gap-2 border-0 bg-transparent sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className=""
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || (!canUpdate && !canAssign)}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
