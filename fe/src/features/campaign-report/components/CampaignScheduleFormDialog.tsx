import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { SearchableSelect } from '@/components/common/SearchableSelect'
import { campaignReportApi } from '@/features/campaign-report/api'
import { formatApiError } from '@/features/settings/components'
import type { CampaignScheduleRow } from '@/features/campaign-report/types'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

// ─── Schema ───────────────────────────────────────────────────────────────────

function parseCampaignIds(raw: string): string[] {
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  turn_on_time: z.string().nullable().optional(),
  turn_off_time: z.string().nullable().optional(),
  is_active: z.boolean(),
  campaign_ids_text: z
    .string()
    .refine((v) => parseCampaignIds(v).length > 0, 'At least one campaign ID is required'),
})

type FormValues = z.infer<typeof schema>

function toHHMM(value: string | null | undefined): string | null {
  if (!value) return null
  return value.slice(0, 5)
}

function generateTimeOptions(intervalMinutes = 5) {
  const options: { label: string; value: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      options.push({ label: `${hh}:${mm}`, value: `${hh}:${mm}` })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions(5)

const DEFAULT_VALUES: FormValues = {
  name: '',
  turn_on_time: null,
  turn_off_time: null,
  is_active: true,
  campaign_ids_text: '',
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

type CampaignScheduleFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editItem: CampaignScheduleRow | null
  onSuccess: () => void
}

export function CampaignScheduleFormDialog({
  open,
  onOpenChange,
  editItem,
  onSuccess,
}: CampaignScheduleFormDialogProps) {
  const isEdit = !!editItem
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    if (editItem) {
      form.reset({
        name: editItem.name,
        turn_on_time: toHHMM(editItem.turn_on_time),
        turn_off_time: toHHMM(editItem.turn_off_time),
        is_active: editItem.is_active,
        campaign_ids_text: editItem.campaign_ids.join('\n'),
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, editItem, form])

  const onSubmit = async (values: FormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      const payload = {
        name: values.name,
        turn_on_time: toHHMM(values.turn_on_time),
        turn_off_time: toHHMM(values.turn_off_time),
        is_active: values.is_active,
        campaign_ids: parseCampaignIds(values.campaign_ids_text),
      }
      if (isEdit && editItem) {
        await campaignReportApi.updateCampaignSchedule(editItem.id, payload)
        toast.success('Schedule updated successfully')
      } else {
        await campaignReportApi.createCampaignSchedule(payload)
        toast.success('Schedule created successfully')
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
      <DialogContent className="max-h-[calc(100vh-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Schedule' : 'New Schedule'}</DialogTitle>
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
                    <Input autoComplete="off" disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="turn_on_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turn On Time</FormLabel>
                    <SearchableSelect
                      value={field.value ?? undefined}
                      onValueChange={(v) => field.onChange(v ?? null)}
                      options={TIME_OPTIONS}
                      placeholder="Select time…"
                      searchPlaceholder="Search time…"
                      disabled={submitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="turn_off_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turn Off Time</FormLabel>
                    <SearchableSelect
                      value={field.value ?? undefined}
                      onValueChange={(v) => field.onChange(v ?? null)}
                      options={TIME_OPTIONS}
                      placeholder="Select time…"
                      searchPlaceholder="Search time…"
                      disabled={submitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="campaign_ids_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Campaign IDs (One per line) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={'1234567890\n1234567891\n1234567892'}
                      className="min-h-45 resize-y font-mono text-sm"
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
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormLabel className="mt-0!">Active</FormLabel>
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
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {isEdit ? 'Saving…' : 'Creating…'}
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    {isEdit ? 'Save Changes' : 'Create Schedule'}
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
