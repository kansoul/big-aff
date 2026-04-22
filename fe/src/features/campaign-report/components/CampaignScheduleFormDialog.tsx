import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Check, ChevronDown, Loader2, Save, Search, X } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  turn_on_time: z.string().nullable().optional(),
  turn_off_time: z.string().nullable().optional(),
  is_active: z.boolean(),
  campaign_ids: z.array(z.string()).min(1, 'At least one campaign is required'),
})

type FormValues = z.infer<typeof schema>

function toHHMM(value: string | null | undefined): string | null {
  if (!value) return null
  return value.slice(0, 5)
}

const DEFAULT_VALUES: FormValues = {
  name: '',
  turn_on_time: null,
  turn_off_time: null,
  is_active: true,
  campaign_ids: [],
}

// ─── Campaign multi-select ────────────────────────────────────────────────────

type CampaignMultiSelectProps = {
  value: string[]
  onChange: (value: string[]) => void
  options: { label: string; value: string }[]
  disabled?: boolean
  hasError?: boolean
}

function CampaignMultiSelect({ value, onChange, options, disabled, hasError }: CampaignMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }

  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label)
  const triggerText =
    selectedLabels.length === 0
      ? 'Select campaigns…'
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} campaigns selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full overflow-hidden justify-between gap-1.5 font-normal',
            value.length === 0 && 'text-muted-foreground',
            hasError && 'border-destructive',
          )}
        >
          <span className="flex-1 truncate text-left">{triggerText}</span>
          {value.length > 0 ? (
            <span
              role="button"
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation()
                onChange([])
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        align="start"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-52 overflow-y-auto py-1" onWheel={(e) => e.stopPropagation()}>
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No campaigns found</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted',
                  value.includes(opt.value) && 'bg-muted/60 font-medium',
                )}
              >
                <Check
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    value.includes(opt.value) ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {opt.label}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

type CampaignScheduleFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editItem: CampaignScheduleRow | null
  campaignOptions: { label: string; value: string }[]
  onSuccess: () => void
}

export function CampaignScheduleFormDialog({
  open,
  onOpenChange,
  editItem,
  campaignOptions,
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
        campaign_ids: editItem.campaign_ids,
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
        campaign_ids: values.campaign_ids,
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
      <DialogContent className="flex max-h-[min(90vh,560px)] w-full max-w-[min(94vw,32rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{isEdit ? 'Edit Schedule' : 'New Schedule'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e)
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
              {formError ? (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{formError}</p>
                </div>
              ) : null}

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

              <FormField
                control={form.control}
                name="campaign_ids"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Campaigns <span className="text-destructive">*</span>
                    </FormLabel>
                    <CampaignMultiSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={campaignOptions}
                      disabled={submitting}
                      hasError={!!fieldState.error}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="turn_on_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turn On Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          disabled={submitting}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
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
                      <FormControl>
                        <Input
                          type="time"
                          disabled={submitting}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
            </div>

            <DialogFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
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
