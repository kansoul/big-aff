import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatApiError } from '@/features/settings/components'
import { mainTeamsApi } from '@/features/main-teams/api'
import {
  mainTeamFormSchema,
  type MainTeam,
  type MainTeamFormValues,
} from '@/features/main-teams/types'

type MainTeamFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mainTeam?: MainTeam | null
  onSuccess: () => void
}

const DEFAULT_VALUES: MainTeamFormValues = {
  name: '',
  description: null,
  sync_campaign_reports: false,
  account_ids_text: '',
}

function parseLines(value?: string): string[] {
  return Array.from(
    new Set(
      (value ?? '')
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function joinLines(items?: string[]): string {
  return (items ?? []).join('\n')
}

export function MainTeamFormDialog({
  open,
  onOpenChange,
  mainTeam,
  onSuccess,
}: MainTeamFormDialogProps) {
  const isEdit = !!mainTeam
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const accountIdsText = useMemo(
    () => joinLines(mainTeam?.accounts?.map((account) => account.account_id)),
    [mainTeam],
  )
  const form = useForm<MainTeamFormValues>({
    resolver: zodResolver(mainTeamFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return

    setFormError(null)
    if (mainTeam) {
      form.reset({
        name: mainTeam.name,
        description: mainTeam.description ?? null,
        sync_campaign_reports: mainTeam.sync_campaign_reports,
        account_ids_text: accountIdsText,
      })
      return
    }

    form.reset(DEFAULT_VALUES)
  }, [accountIdsText, form, mainTeam, open])

  const onSubmit = async (values: MainTeamFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)

      const payload = {
        name: values.name,
        description: values.description ?? null,
        sync_campaign_reports: values.sync_campaign_reports,
        account_ids: parseLines(values.account_ids_text),
      }

      if (isEdit && mainTeam) {
        await mainTeamsApi.update(mainTeam.id, payload)
        toast.success('Main team updated successfully')
      } else {
        await mainTeamsApi.create(payload)
        toast.success('Main team created successfully')
      }

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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Main Team' : 'Add Main Team'}</DialogTitle>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Main team name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short description..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sync_campaign_reports"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
                  <div className="space-y-0.5">
                    <FormLabel>Sync campaign reports</FormLabel>
                    <FormDescription>
                      Main System will fetch campaign spend for this team's accounts.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="account_ids_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account IDs</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="act_123&#10;act_456"
                        className="min-h-36 font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
                    {isEdit ? 'Save Changes' : 'Create Main Team'}
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
