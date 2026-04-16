import type { Dispatch, SetStateAction } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

import { PermissionCollapsibleTree } from './PermissionCollapsibleTree'
import { RoleFormErrorAlert } from './RoleFormErrorAlert'
import type { RoleNameFormValues } from '@/features/settings/types'

type CreateRoleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  canAssign: boolean
  formError: string | null
  createForm: UseFormReturn<RoleNameFormValues>
  createPermissions: string[]
  setCreatePermissions: Dispatch<SetStateAction<string[]>>
  submitting: boolean
  onSubmit: (
    values: RoleNameFormValues,
    options?: {
      createAnother?: boolean
    },
  ) => void | Promise<void>
  /** When provided, restricts selectable permissions to this list. null = no restriction (admin). */
  allowedPermissions?: string[] | null
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  canAssign,
  formError,
  createForm,
  createPermissions,
  setCreatePermissions,
  submitting,
  onSubmit,
  allowedPermissions,
}: CreateRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          canAssign
            ? 'flex max-h-[min(92vh,720px)] w-full max-w-[min(94vw,48rem)] flex-col gap-0 p-6 sm:max-w-3xl'
            : ' sm:max-w-md'
        }
      >
        <DialogHeader className={canAssign ? 'mb-1 shrink-0' : ''}>
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            New role
          </DialogTitle>
          <DialogDescription>
            {canAssign
              ? 'Choose a name and optional permissions. You can change them later when editing the role.'
              : 'Choose a unique name. You need assign permission to set permissions on create.'}
          </DialogDescription>
        </DialogHeader>
        {formError && open ? <RoleFormErrorAlert message={formError} className="shrink-0" /> : null}
        <Form {...createForm}>
          <form
            onSubmit={(e) => {
              void createForm.handleSubmit((values) => onSubmit(values, { createAnother: false }))(
                e,
              )
            }}
            className={canAssign ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-4'}
          >
            <FormField
              control={createForm.control}
              name="name"
              render={({ field }) => (
                <FormItem className={canAssign ? 'shrink-0' : ''}>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. analyst" className="" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canAssign ? (
              <div className="flex min-h-0 flex-1 flex-col gap-1">
                <FormLabel className="text-foreground">Permissions</FormLabel>
                <div className="min-h-[min(40vh,320px)] max-h-[min(52vh,400px)] flex-1 overflow-y-auto rounded-md border border-border px-3 py-2">
                  <PermissionCollapsibleTree
                    selected={createPermissions}
                    setSelected={setCreatePermissions}
                    allowedPermissions={allowedPermissions}
                  />
                </div>
              </div>
            ) : null}
            <DialogFooter
              className={
                canAssign ? 'mt-2 shrink-0 gap-2 border-0 bg-transparent sm:justify-end' : ''
              }
            >
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  void createForm.handleSubmit((values) =>
                    onSubmit(values, { createAnother: true }),
                  )()
                }}
              >
                Create & Create Another
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Create role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
