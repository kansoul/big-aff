import { AlertCircle, Loader2, Save } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'

import { SearchableSelect } from '@/components/common/SearchableSelect'
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
import type { UserCreateFormValues, UserUpdateFormValues } from '@/features/users/types'
import type { ManagedUser, Role } from '@/shared/types'

type UserFormValues = UserCreateFormValues | UserUpdateFormValues

type UserFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: ManagedUser | null
  formError: string | null
  form: UseFormReturn<UserFormValues>
  roles: Role[]
  submitting: boolean
  onSubmit: (
    values: UserFormValues,
    options?: {
      createAnother?: boolean
    },
  ) => void | Promise<void>
}

export function UserFormDialog({
  open,
  onOpenChange,
  user = null,
  formError,
  form,
  roles,
  submitting,
  onSubmit,
}: UserFormDialogProps) {
  const isEdit = !!user

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit((values) => onSubmit(values, { createAnother: false }))(e)
            }}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="User name"
                      autoComplete="name"
                      disabled={submitting}
                      {...field}
                    />
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
                  <FormLabel>
                    Email <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      autoComplete="email"
                      disabled={submitting}
                      {...field}
                    />
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
                  <FormLabel>
                    {isEdit ? 'New Password' : 'Password'}{' '}
                    {!isEdit ? <span className="text-destructive">*</span> : null}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder={isEdit ? 'Leave blank to keep current password' : undefined}
                      disabled={submitting}
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
                  <FormLabel>
                    Role <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(value) => field.onChange(Number(value))}
                      options={roles.map((role) => ({ label: role.name, value: String(role.id) }))}
                      placeholder="Select role"
                      disabled={submitting || roles.length === 0}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && open ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{formError}</p>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {!isEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting || roles.length === 0}
                  onClick={() => {
                    void form.handleSubmit((values) => onSubmit(values, { createAnother: true }))()
                  }}
                >
                  Create & create another
                </Button>
              ) : null}
              <Button type="submit" disabled={submitting || roles.length === 0} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {isEdit ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    {isEdit ? 'Save Changes' : 'Create User'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
