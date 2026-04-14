import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { SearchableSelect } from '@/components/common/SearchableSelect'
import type { SearchableSelectOption } from '@/components/common/SearchableSelect'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { accountsApi } from '@/features/accounts/api'
import type {
  Account,
  AccountCreateFormValues,
  AccountUpdateFormValues,
} from '@/features/accounts/types'
import { accountCreateSchema, accountUpdateSchema } from '@/features/accounts/types'
import { formatApiError } from '@/features/settings/components'

const ADS_TYPE_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
] as const

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'die', label: 'Die' },
]

const ACCOUNT_CREATE_DEFAULT_VALUES: AccountCreateFormValues = {
  ads_type: 'facebook',
  business_center_id: null,
  team_id: null,
  status: null,
  is_special: false,
  sync_to_mcc: false,
  lines: '',
}

type CreateAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  businessCenterOptions: SearchableSelectOption[]
  teamOptions: SearchableSelectOption[]
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  businessCenterOptions,
  teamOptions,
}: CreateAccountDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<AccountCreateFormValues>({
    resolver: zodResolver(accountCreateSchema),
    defaultValues: ACCOUNT_CREATE_DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setFormError(null)
    form.reset(ACCOUNT_CREATE_DEFAULT_VALUES)
  }, [open, form])

  const onSubmit = async (
    values: AccountCreateFormValues,
    options?: {
      createAnother?: boolean
    },
  ) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await accountsApi.create({
        ads_type: values.ads_type,
        business_center_id: values.business_center_id,
        team_id: values.team_id,
        status: values.status,
        is_special: values.is_special,
        sync_to_mcc: values.sync_to_mcc,
        lines: values.lines,
      })
      toast.success('Account created successfully')
      if (options?.createAnother) {
        form.reset(ACCOUNT_CREATE_DEFAULT_VALUES)
      } else {
        onOpenChange(false)
      }
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Accounts</DialogTitle>
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
              name="ads_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Ads Type <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={ADS_TYPE_OPTIONS.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      placeholder="Select ads type"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="business_center_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Center ID</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value != null ? String(field.value) : '__none__'}
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : Number(value))
                      }
                      options={[{ value: '__none__', label: 'None' }, ...businessCenterOptions]}
                      placeholder="Select business center"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="team_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value != null ? String(field.value) : '__none__'}
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : Number(value))
                      }
                      options={[{ value: '__none__', label: 'None' }, ...teamOptions]}
                      placeholder="Select team"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value ?? undefined}
                      onValueChange={field.onChange}
                      options={STATUS_OPTIONS}
                      placeholder="Select status"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="is_special"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        disabled={submitting}
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel>Is Special</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sync_to_mcc"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        disabled={submitting}
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel>Sync To MCC</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Lines <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={7}
                      placeholder={`123456789|My Account Name\n1234123123|Another Account\n---\nMain Team IDs:\n(none available)
                        `}
                      value={field.value}
                      disabled={submitting}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError ? (
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
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  void form.handleSubmit((values) => onSubmit(values, { createAnother: true }))()
                }}
              >
                Create & Create Another
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Create
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

type EditAccountDialogProps = {
  account: Account | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  businessCenterOptions: SearchableSelectOption[]
  teamOptions: SearchableSelectOption[]
}

export function EditAccountDialog({
  account,
  onOpenChange,
  onSuccess,
  businessCenterOptions,
  teamOptions,
}: EditAccountDialogProps) {
  const open = account !== null
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<AccountUpdateFormValues>({
    resolver: zodResolver(accountUpdateSchema),
    defaultValues: {
      account_id: '',
      account_name: null,
      ads_type: 'facebook',
      business_center_id: null,
      team_id: null,
      status: null,
      is_special: false,
      sync_to_mcc: false,
    },
  })

  const defaults = useMemo(
    () => ({
      account_id: account?.account_id ?? '',
      account_name: account?.account_name ?? null,
      ads_type: account?.ads_type ?? ('facebook' as const),
      business_center_id: account?.business_center_id ?? null,
      team_id: account?.team_id ?? null,
      status: account?.status ?? null,
      is_special: account?.is_special ?? false,
      sync_to_mcc: account?.sync_to_mcc ?? false,
    }),
    [account],
  )

  useEffect(() => {
    if (!open) {
      return
    }
    setFormError(null)
    form.reset(defaults)
  }, [open, defaults, form])

  const onSubmit = async (values: AccountUpdateFormValues) => {
    if (!account) {
      return
    }

    try {
      setFormError(null)
      setSubmitting(true)
      await accountsApi.update(account.id, {
        account_id: values.account_id,
        account_name: values.account_name,
        ads_type: values.ads_type,
        business_center_id: values.business_center_id,
        team_id: values.team_id,
        status: values.status,
        is_special: values.is_special,
        sync_to_mcc: values.sync_to_mcc,
      })
      toast.success('Account updated successfully')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e)
            }}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Account ID <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter account ID" {...field} disabled={submitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="account_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter account name"
                      value={field.value ?? ''}
                      disabled={submitting}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ads_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Ads Type <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={ADS_TYPE_OPTIONS.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      placeholder="Select ads type"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="business_center_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Center ID</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value != null ? String(field.value) : '__none__'}
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : Number(value))
                      }
                      options={[{ value: '__none__', label: 'None' }, ...businessCenterOptions]}
                      placeholder="Select business center"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="team_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value != null ? String(field.value) : '__none__'}
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : Number(value))
                      }
                      options={[{ value: '__none__', label: 'None' }, ...teamOptions]}
                      placeholder="Select team"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value ?? undefined}
                      onValueChange={(value) => field.onChange(value === '__none__' ? null : value)}
                      options={[...STATUS_OPTIONS]}
                      placeholder="Select status"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="is_special"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        disabled={submitting}
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel>Is Special</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sync_to_mcc"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        disabled={submitting}
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel>Sync To MCC</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {formError ? (
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
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Changes
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
