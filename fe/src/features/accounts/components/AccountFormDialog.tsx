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
import {
  ACCOUNT_STATUS_OPTIONS,
  accountCreateSchema,
  accountUpdateSchema,
} from '@/features/accounts/types'
import { formatApiError } from '@/features/settings/components'
import { usersApi } from '@/features/users/api/users'
import { useAuthStore } from '@/hooks/useAuthStore'

const ADS_TYPE_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
  { value: 'tiktok', label: 'TikTok' },
] as const

function useUsers(): SearchableSelectOption[] {
  const [users, setUsers] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    let ignore = false
    usersApi
      .listOptions()
      .then((res) => {
        if (!ignore) {
          setUsers(res.data.data)
        }
      })
      .catch(() => {
        if (!ignore) {
          setUsers([])
        }
      })
    return () => {
      ignore = true
    }
  }, [])

  return useMemo(() => users.map((u) => ({ value: String(u.id), label: u.name })), [users])
}

function useMainTeams(enabled: boolean): SearchableSelectOption[] {
  const [mainTeams, setMainTeams] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let ignore = false
    accountsApi
      .mainTeamOptions()
      .then((res) => {
        if (!ignore) {
          setMainTeams(res.data.data)
        }
      })
      .catch(() => {
        if (!ignore) {
          setMainTeams([])
        }
      })

    return () => {
      ignore = true
    }
  }, [enabled])

  return useMemo(() => {
    if (!enabled) return []

    return mainTeams.map((team) => ({ value: String(team.id), label: team.name }))
  }, [enabled, mainTeams])
}

type CreateAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  businessCenterOptions: SearchableSelectOption[]
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  businessCenterOptions,
}: CreateAccountDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const canAssignMainTeam = useAuthStore((state) =>
    Boolean(state.user?.is_main_system && state.user.can_view_accounts_unscoped),
  )
  const userOptions = useUsers()
  const mainTeamOptions = useMainTeams(open && canAssignMainTeam)

  const form = useForm<AccountCreateFormValues>({
    resolver: zodResolver(accountCreateSchema),
    defaultValues: {
      ads_type: 'facebook',
      business_center_id: null,
      main_team_id: null,
      user_id: null,
      status: null,
      is_special: false,
      sync_to_mcc: false,
      roas_enabled: false,
      gtag_enabled: false,
      lines: '',
    },
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    form.reset({
      ads_type: 'facebook',
      business_center_id: null,
      main_team_id: null,
      user_id: null,
      status: null,
      is_special: false,
      sync_to_mcc: false,
      roas_enabled: false,
      gtag_enabled: false,
      lines: '',
    })
  }, [open, form])

  const onSubmit = async (
    values: AccountCreateFormValues,
    options?: { createAnother?: boolean },
  ) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await accountsApi.create({
        ads_type: values.ads_type,
        business_center_id: values.business_center_id,
        ...(canAssignMainTeam ? { main_team_id: values.main_team_id } : {}),
        user_id: values.user_id,
        status: values.status,
        is_special: values.is_special,
        sync_to_mcc: values.sync_to_mcc,
        roas_enabled: values.roas_enabled,
        gtag_enabled: values.gtag_enabled,
        lines: values.lines,
      })
      toast.success('Account created successfully')
      if (options?.createAnother) {
        form.reset({
          ads_type: 'facebook',
          business_center_id: null,
          main_team_id: null,
          user_id: null,
          status: null,
          is_special: false,
          sync_to_mcc: false,
          roas_enabled: false,
          lines: '',
        })
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
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to User</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value != null ? String(field.value) : '__none__'}
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : Number(value))
                      }
                      options={[{ value: '__none__', label: 'None' }, ...userOptions]}
                      placeholder="Select user"
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
                  <FormLabel>Business Center</FormLabel>
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

            {canAssignMainTeam ? (
              <FormField
                control={form.control}
                name="main_team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Team</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value != null ? String(field.value) : '__none__'}
                        onValueChange={(value) =>
                          field.onChange(value === '__none__' ? null : Number(value))
                        }
                        options={[{ value: '__none__', label: 'None' }, ...mainTeamOptions]}
                        placeholder="Select main team"
                        disabled={submitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

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
                      options={[...ACCOUNT_STATUS_OPTIONS]}
                      placeholder="Select status"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

              <FormField
                control={form.control}
                name="roas_enabled"
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
                      <FormLabel>ROAS Upload</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gtag_enabled"
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
                      <FormLabel>Gtag</FormLabel>
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
                      placeholder={`123456789|My Account Name\n1234123123|Another Account`}
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
                variant="outline"
                type="button"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void form.handleSubmit((values) => onSubmit(values, { createAnother: true }))()
                }}
              >
                Create & create another
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
}

export function EditAccountDialog({
  account,
  onOpenChange,
  onSuccess,
  businessCenterOptions,
}: EditAccountDialogProps) {
  const open = account !== null
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const canAssignMainTeam = useAuthStore((state) =>
    Boolean(state.user?.is_main_system && state.user.can_view_accounts_unscoped),
  )
  const userOptions = useUsers()
  const mainTeamOptions = useMainTeams(open && canAssignMainTeam)

  const form = useForm<AccountUpdateFormValues>({
    resolver: zodResolver(accountUpdateSchema),
    defaultValues: {
      account_id: '',
      account_name: null,
      ads_type: 'facebook',
      business_center_id: null,
      main_team_id: null,
      user_id: null,
      status: null,
      is_special: false,
      sync_to_mcc: false,
      roas_enabled: false,
      gtag_enabled: false,
    },
  })

  const defaults = useMemo(
    () => ({
      account_id: account?.account_id ?? '',
      account_name: account?.account_name ?? null,
      ads_type: (account?.ads_type === 'unknown'
        ? 'facebook'
        : (account?.ads_type ?? 'facebook')) as 'facebook' | 'google' | 'tiktok',
      business_center_id: account?.business_center_id ?? null,
      main_team_id: account?.main_team_id ?? null,
      user_id: account?.user_id ?? null,
      status: account?.status ?? null,
      is_special: account?.is_special ?? false,
      sync_to_mcc: account?.sync_to_mcc ?? false,
      roas_enabled: account?.roas_enabled ?? false,
      gtag_enabled: account?.gtag_enabled ?? false,
    }),
    [account],
  )

  useEffect(() => {
    if (!open) return
    setFormError(null)
    form.reset(defaults)
  }, [open, defaults, form])

  const onSubmit = async (values: AccountUpdateFormValues) => {
    if (!account) return

    try {
      setFormError(null)
      setSubmitting(true)
      await accountsApi.update(account.id, {
        account_id: values.account_id,
        account_name: values.account_name,
        ads_type: values.ads_type,
        business_center_id: values.business_center_id,
        ...(canAssignMainTeam ? { main_team_id: values.main_team_id } : {}),
        user_id: values.user_id,
        status: values.status,
        is_special: values.is_special,
        sync_to_mcc: values.sync_to_mcc,
        roas_enabled: values.roas_enabled,
        gtag_enabled: values.gtag_enabled,
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
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to User</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value != null ? String(field.value) : '__none__'}
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : Number(value))
                      }
                      options={[{ value: '__none__', label: 'None' }, ...userOptions]}
                      placeholder="Select user"
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
                  <FormLabel>Business Center</FormLabel>
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

            {canAssignMainTeam ? (
              <FormField
                control={form.control}
                name="main_team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Team</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value != null ? String(field.value) : '__none__'}
                        onValueChange={(value) =>
                          field.onChange(value === '__none__' ? null : Number(value))
                        }
                        options={[{ value: '__none__', label: 'None' }, ...mainTeamOptions]}
                        placeholder="Select main team"
                        disabled={submitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

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
                      options={[...ACCOUNT_STATUS_OPTIONS]}
                      placeholder="Select status"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

              <FormField
                control={form.control}
                name="roas_enabled"
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
                      <FormLabel>ROAS Upload</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gtag_enabled"
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
                      <FormLabel>Gtag</FormLabel>
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
