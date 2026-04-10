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
import { SearchableSelect } from '@/components/common/SearchableSelect'
import type { UserUpdateFormValues } from '@/features/users/types'
import { RoleFormErrorAlert } from '@/features/settings/components/RoleFormErrorAlert'
import type { ManagedUser, Role } from '@/shared/types'

type EditUserDialogProps = {
  userRow: ManagedUser | null
  onOpenChange: (open: boolean) => void
  formError: string | null
  form: UseFormReturn<UserUpdateFormValues>
  roles: Role[]
  submitting: boolean
  onSubmit: (values: UserUpdateFormValues) => void | Promise<void>
}

export function EditUserDialog({
  userRow,
  onOpenChange,
  formError,
  form,
  roles,
  submitting,
  onSubmit,
}: EditUserDialogProps) {
  return (
    <Dialog open={!!userRow} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[min(92vh,640px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            Edit user
          </DialogTitle>
          <DialogDescription>
            Update profile or role. Leave password blank to keep the current password.
          </DialogDescription>
        </DialogHeader>
        {formError && userRow ? (
          <RoleFormErrorAlert message={formError} className="shrink-0" />
        ) : null}
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e)
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Leave blank to keep current"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <SearchableSelect
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(v) => field.onChange(Number(v))}
                    options={roles.map((r) => ({ label: r.name, value: String(r.id) }))}
                    placeholder="Select role"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-2 shrink-0 gap-2 border-0 bg-transparent sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || roles.length === 0}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
