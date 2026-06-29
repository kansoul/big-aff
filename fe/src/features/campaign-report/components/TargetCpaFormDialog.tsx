import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { campaignReportApi } from '@/features/campaign-report/api'
import { formatApiError } from '@/features/settings/components'
import type { CampaignReportRow } from '@/features/campaign-report/types'
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

const MAX_TARGET_CPA = 5

const schema = z.object({
  target_cpa: z
    .string()
    .refine((v) => v.trim() !== '', 'Target CPA is required')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Must be a non-negative number')
    .refine((v) => Number(v) <= MAX_TARGET_CPA, `Target CPA tối đa là $${MAX_TARGET_CPA}`),
})

type FormValues = z.infer<typeof schema>

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function toCpaString(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n) || n === 0) return ''
  return String(n)
}

export function TargetCpaFormDialog({
  open,
  onOpenChange,
  row,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: CampaignReportRow | null
  onSuccess: (campaignId: string, targetCpa: number) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // CPA value awaiting confirmation when it exceeds RPC + $1.
  const [pendingCpa, setPendingCpa] = useState<number | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { target_cpa: '' },
  })

  useEffect(() => {
    if (open && row) {
      form.reset({ target_cpa: toCpaString(row.target_cpa) })
      setFormError(null)
      setPendingCpa(null)
    }
  }, [open, row, form])

  const rpc = toNumber(row?.r_rpc)

  const save = async (targetCpa: number) => {
    if (!row) return
    try {
      setFormError(null)
      setSubmitting(true)
      await campaignReportApi.updateTargetCpa(row.campaign_id, { target_cpa: targetCpa })
      toast.success('Target CPA updated')
      onSuccess(row.campaign_id, targetCpa)
      onOpenChange(false)
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    if (!row) return
    const targetCpa = Number(values.target_cpa)
    // Warn (and require confirmation) if CPA is more than $1 above RPC.
    if (rpc > 0 && targetCpa > rpc + 1) {
      setPendingCpa(targetCpa)
      return
    }
    await save(targetCpa)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Target CPA</DialogTitle>
          {row?.campaign_name && (
            <p className="truncate text-sm text-muted-foreground" title={row.campaign_name}>
              {row.campaign_name}
            </p>
          )}
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void form.handleSubmit(onSubmit)()
            }}
            className="flex flex-col gap-5"
          >
            <FormField
              control={form.control}
              name="target_cpa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target CPA (USD)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={MAX_TARGET_CPA}
                        placeholder="1.00"
                        className="pl-6"
                        disabled={submitting || pendingCpa !== null}
                        {...field}
                        onChange={(e) => {
                          setPendingCpa(null)
                          field.onChange(e)
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Chi phí mục tiêu cho mỗi hành động (CPA).</FormDescription>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Tối đa <span className="font-medium text-foreground">${MAX_TARGET_CPA}</span>
                    </span>
                    {rpc > 0 && (
                      <span>
                        RPC hiện tại:{' '}
                        <span className="font-medium text-foreground">${rpc.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {formError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {pendingCpa !== null && (
              <div className="flex flex-col items-center justify-center text-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Cảnh báo CPA cao</span>
                </div>
                <span>
                  Bạn có muốn quất CPA{' '}
                  <span className="font-semibold">${pendingCpa.toFixed(2)}</span> cao hơn RPC{' '}
                  <span className="font-semibold">${rpc.toFixed(2)}</span> tận{' '}
                  <span className="font-semibold">${(pendingCpa - rpc).toFixed(2)}</span> không?
                </span>
              </div>
            )}
            <DialogFooter>
              {pendingCpa !== null ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => setPendingCpa(null)}
                  >
                    Sửa lại
                  </Button>
                  <Button type="button" disabled={submitting} onClick={() => void save(pendingCpa)}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Quất luôn
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
