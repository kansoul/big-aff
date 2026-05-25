import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { SearchableSelect } from '@/components/common/SearchableSelect'
import { DatePicker } from '@/components/ui/date-picker'
import { campaignReportApi } from '@/features/campaign-report/api'
import { formatApiError } from '@/features/settings/components'
import type { CampaignRuleRow } from '@/features/campaign-report/types'
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
import { Textarea } from '@/components/ui/textarea'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCampaignIdLines(raw: string): string[] {
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseCampaignIds(raw: string): string[] {
  return getCampaignIdLines(raw)
}

function toNullableNumber(val: string): number | null {
  if (val === '' || val == null) return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

function isNullableNumberString(
  val: string | null | undefined,
  opts: { min?: number; integer?: boolean } = {},
): boolean {
  if (val == null || val.trim() === '') return true
  const n = Number(val)
  if (!Number.isFinite(n)) return false
  if (opts.integer && !Number.isInteger(n)) return false
  if (opts.min != null && n < opts.min) return false
  return true
}

function isNullableHHMMString(val: string | null | undefined): boolean {
  if (val == null || val === '') return true
  return /^\d{2}:\d{2}$/.test(val)
}

function toHHMM(value: string | null | undefined): string | null {
  if (!value) return null
  return value.slice(0, 5)
}

const ENTITY_TYPE_OPTIONS = [
  { label: 'Campaign', value: 'campaign' },
  { label: 'Ad/Adset', value: 'ad_adset' },
]

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255, 'Max 255 characters'),
    code_rule: z.string().optional(),
    entity_type: z.enum(['campaign', 'ad_adset'], { message: 'Entity type is required' }),
    entity_ids_text: z.string().optional(),
    // Campaign auto-off conditions
    min_roi: z
      .string()
      .optional()
      .refine((value) => isNullableNumberString(value), 'Min ROI must be a valid number'),
    min_profit: z
      .string()
      .optional()
      .refine((value) => isNullableNumberString(value), 'Min Profit must be a valid number'),
    // Active rule conditions
    min_revenue: z
      .string()
      .optional()
      .refine(
        (value) => isNullableNumberString(value, { min: 0 }),
        'Min Revenue must be greater than or equal to 0',
      ),
    min_spend: z
      .string()
      .optional()
      .refine(
        (value) => isNullableNumberString(value, { min: 0 }),
        'Min Spend must be greater than or equal to 0',
      ),
    expired_at: z.string().nullable().optional(),
    start_hour: z
      .string()
      .nullable()
      .optional()
      .refine((value) => isNullableHHMMString(value), 'Start Hour must match HH:mm'),
    end_hour: z
      .string()
      .nullable()
      .optional()
      .refine((value) => isNullableHHMMString(value), 'End Hour must match HH:mm'),
  })
  .superRefine((data, ctx) => {
    if (data.entity_type === 'ad_adset' && !data.entity_ids_text?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ad/Adset IDs are required',
        path: ['entity_ids_text'],
      })
    }

    if (data.entity_type === 'campaign' || data.entity_type === 'ad_adset') {
      const hasRoi = data.min_roi != null && data.min_roi.trim() !== ''
      const hasProfit = data.min_profit != null && data.min_profit.trim() !== ''

      if (!hasRoi && !hasProfit) {
        const msg = 'At least one of Min ROI or Min Profit is required'
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg,
          path: ['min_roi'],
        })
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg,
          path: ['min_profit'],
        })
      }
      if (!data.min_spend?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Min Spend is required',
          path: ['min_spend'],
        })
      }
    }
  })

type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  title: '',
  code_rule: '',
  entity_type: 'campaign',
  entity_ids_text: '',
  min_roi: '',
  min_profit: '',
  min_revenue: '',
  min_spend: '',
  expired_at: null,
  start_hour: null,
  end_hour: null,
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function ConditionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

type CampaignRuleFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editItem: CampaignRuleRow | null
  onSuccess: () => void
}

export function CampaignRuleFormDialog({
  open,
  onOpenChange,
  editItem,
  onSuccess,
}: CampaignRuleFormDialogProps) {
  const isEdit = !!editItem
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const keepOpenRef = useRef(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  const entityType = form.watch('entity_type')

  useEffect(() => {
    if (!open) return
    setFormError(null)
    if (editItem) {
      form.reset({
        title: editItem.title,
        code_rule: editItem.code_rule ?? '',
        entity_type: editItem.entity_type,
        entity_ids_text: editItem.entity_ids.join('\n'),
        min_roi: editItem.min_roi ?? '',
        min_profit: editItem.min_profit ?? '',
        min_revenue: editItem.min_revenue ?? '',
        min_spend: editItem.min_spend ?? '',
        expired_at: editItem.expired_at ? editItem.expired_at.slice(0, 10) : null,
        start_hour: toHHMM(editItem.start_hour),
        end_hour: toHHMM(editItem.end_hour),
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, editItem, form])

  const buildPayload = (values: FormValues) => {
    const entityIds = parseCampaignIds(values.entity_ids_text ?? '')
    const commonPayload = {
      title: values.title,
      entity_type: values.entity_type,
      expired_at: values.expired_at ?? null,
      start_hour: values.start_hour || null,
      end_hour: values.end_hour || null,
      entity_ids: entityIds,
    }

    return {
      ...commonPayload,
      min_roi: toNullableNumber(values.min_roi ?? ''),
      min_profit: toNullableNumber(values.min_profit ?? ''),
      min_revenue: toNullableNumber(values.min_revenue ?? ''),
      min_spend: toNullableNumber(values.min_spend ?? ''),
    }
  }

  const onSubmit = async (values: FormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      const payload = buildPayload(values)

      if (isEdit && editItem) {
        await campaignReportApi.updateCampaignRule(editItem.id, payload)
        toast.success('Rule updated successfully')
        onOpenChange(false)
      } else {
        await campaignReportApi.createCampaignRule(payload)
        toast.success('Rule created successfully')
        if (keepOpenRef.current) {
          form.reset(DEFAULT_VALUES)
          setFormError(null)
        } else {
          onOpenChange(false)
        }
      }
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
      keepOpenRef.current = false
    }
  }

  const handleCreateAndAnother = () => {
    keepOpenRef.current = true
    void form.handleSubmit(onSubmit)()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Rule' : 'Create Campaign Rule'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              keepOpenRef.current = false
              void form.handleSubmit(onSubmit)(e)
            }}
            className="flex flex-col gap-4"
          >
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Title <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      placeholder="Morning Facebook rule"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Code */}
            <FormField
              control={form.control}
              name="code_rule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" disabled={true} {...field} />
                  </FormControl>
                  <FormDescription>
                    Auto-generated code with prefix &quot;rule_&quot;. Campaigns ending with this
                    value will be automatically added to this rule.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Entity Type */}
            <FormField
              control={form.control}
              name="entity_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Entity Type <span className="text-destructive">*</span>
                  </FormLabel>
                  <SearchableSelect
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? 'campaign')}
                    options={ENTITY_TYPE_OPTIONS}
                    placeholder="Select entity type…"
                    disabled={submitting}
                  />
                  <FormDescription>Select the type of entity this rule applies to.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campaign IDs */}
            <FormField
              control={form.control}
              name="entity_ids_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {entityType === 'campaign'
                      ? 'Campaign IDs (One per line)'
                      : 'Ad/Adset IDs (One per line)'}{' '}
                    {entityType === 'ad_adset' && <span className="text-destructive">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        entityType === 'campaign'
                          ? 'Optional\n1234567890\n1234567891'
                          : '1234567890\n1234567891\n1234567892'
                      }
                      className="min-h-32 resize-y font-mono text-sm"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  {entityType === 'campaign' && (
                    <FormDescription>
                      Leave blank to create the rule and let matching campaigns be added
                      automatically.
                    </FormDescription>
                  )}
                  {entityType === 'ad_adset' && (
                    <FormDescription>
                      Enter Ad IDs or Adset IDs (they are unique so the system will detect
                      automatically).
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Conditions (auto off) ── */}
            {entityType === 'campaign' && (
              <ConditionSection title="Conditions (Conditions for auto off)">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="min_roi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min ROI</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="10"
                            disabled={submitting}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Example: 10, if ROI &lt; 10% will turn off entity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_profit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Profit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="-15"
                            disabled={submitting}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Example: -15, if Profit &lt; -15$ will turn off entity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ConditionSection>
            )}

            {entityType === 'ad_adset' && (
              <ConditionSection title="Conditions (Conditions for auto off)">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="min_roi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min ROI</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="10"
                            disabled={submitting}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Example: 10, if ROI &lt; 10% will turn off entity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_profit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Profit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="-15"
                            disabled={submitting}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Example: -15, if Profit &lt; -15$ will turn off entity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ConditionSection>
            )}

            {/* ── Conditions Rules (active rule) ── */}
            <ConditionSection title="Conditions Rules (Conditions for active rule)">
              {entityType === 'campaign' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="min_revenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Revenue</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="100"
                            disabled={submitting}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Example: 100, apply rule only when revenue &gt;= 100$.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_spend"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Min Spend <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="50"
                            disabled={submitting}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Example: 50, apply rule only when spend &gt;= 50$.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {entityType === 'ad_adset' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="min_revenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Revenue</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="100"
                            disabled={submitting}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Example: 100, apply rule only when revenue &gt;= 100$.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_spend"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Min Spend <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="50"
                            disabled={submitting}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Example: 50, apply rule only when spend &gt;= 50$.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Expiration Date */}
              <FormField
                control={form.control}
                name="expired_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? null}
                        onChange={field.onChange}
                        placeholder="Pick expiry date"
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      Example: 2025-12-02 (UTC -7), Rule expiration date, if expired this rule will
                      no longer be applied. Leave blank if you want the rule to apply forever.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start / End Hour */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="start_hour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Hour</FormLabel>
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
                  name="end_hour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Hour</FormLabel>
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
              <p className="text-xs text-muted-foreground">
                Example: 08:00 - 17:00 (UTC -7), Rule time window, if outside this time window this
                rule will no longer be applied. Leave blank if you want the rule to apply all day.
              </p>
            </ConditionSection>

            {formError ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{formError}</p>
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {!isEdit && (
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={handleCreateAndAnother}
                  className="gap-1.5"
                >
                  {submitting && keepOpenRef.current ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Create &amp; create another
                </Button>
              )}
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting && !keepOpenRef.current ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {isEdit ? 'Saving…' : 'Creating…'}
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    {isEdit ? 'Save Changes' : 'Create'}
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
