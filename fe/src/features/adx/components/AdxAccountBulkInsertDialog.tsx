import { useCallback, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { adxApi } from '@/features/adx/api'
import { ACCOUNT_STATUS_OPTIONS, SOURCE_OPTIONS } from '@/features/adx/components/AdxShared'
import { formatApiError } from '@/features/settings/components'

type AdxAccountBulkInsertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const PLACEHOLDER = `706-350-4758|AdX US Main
123-456-7890|AdX VN Scale
555-123-4567`

export function AdxAccountBulkInsertDialog({
  open,
  onOpenChange,
  onSuccess,
}: AdxAccountBulkInsertDialogProps) {
  const [source, setSource] = useState('google')
  const [status, setStatus] = useState('ACTIVE')
  const [isSpecial, setIsSpecial] = useState(false)
  const [syncToMcc, setSyncToMcc] = useState(false)
  const [lines, setLines] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const reset = useCallback(() => {
    setSource('google')
    setStatus('ACTIVE')
    setIsSpecial(false)
    setSyncToMcc(false)
    setLines('')
    setErrors([])
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (submitting) return
      if (!next) reset()
      onOpenChange(next)
    },
    [onOpenChange, reset, submitting],
  )

  const handleSubmit = useCallback(async () => {
    const trimmed = lines.trim()
    if (!trimmed) {
      toast.error('Vui lòng nhập account trước khi bulk insert.')
      return
    }

    try {
      setSubmitting(true)
      setErrors([])
      const res = await adxApi.bulkCreateAccounts({
        source,
        status,
        is_special: isSpecial,
        sync_to_mcc: syncToMcc,
        lines: trimmed,
      })
      const created = res.data.data.created.length
      const nextErrors = res.data.data.errors
      setErrors(nextErrors)

      if (created > 0) {
        toast.success(
          `Created ${created} account${created === 1 ? '' : 's'}${
            nextErrors.length > 0 ? `, skipped ${nextErrors.length}` : ''
          }`,
        )
        onSuccess()
      }

      if (nextErrors.length === 0) {
        handleOpenChange(false)
      }
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }, [handleOpenChange, isSpecial, lines, onSuccess, source, status, syncToMcc])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-1rem)] w-full max-w-lg flex-col overflow-hidden sm:max-h-[90vh] sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Bulk Insert AdX Accounts</DialogTitle>
          <DialogDescription>
            Enter account IDs one per line. Account name is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Source</p>
              <Select disabled={submitting} value={source} onValueChange={setSource}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Status</p>
              <Select disabled={submitting} value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <Checkbox
                checked={isSpecial}
                disabled={submitting}
                onCheckedChange={(checked) => setIsSpecial(Boolean(checked))}
              />
              <span className="text-sm font-medium">Fetch enabled</span>
            </label>
            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <Checkbox
                checked={syncToMcc}
                disabled={submitting}
                onCheckedChange={(checked) => setSyncToMcc(Boolean(checked))}
              />
              <span className="text-sm font-medium">Sync to MCC</span>
            </label>
          </div>

          <Textarea
            value={lines}
            onChange={(event) => setLines(event.target.value)}
            placeholder={PLACEHOLDER}
            disabled={submitting}
            rows={9}
            className="max-h-[42vh] resize-none overflow-y-auto font-mono text-xs [field-sizing:fixed] sm:min-h-56"
          />

          {errors.length > 0 ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Some lines were skipped:</p>
              <ul className="mt-2 max-h-28 list-disc space-y-1 overflow-y-auto pl-5">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || !lines.trim()}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Upload className="size-3.5" />
                Create Accounts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
