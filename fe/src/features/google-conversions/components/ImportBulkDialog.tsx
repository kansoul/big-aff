import { useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { googleConversionsApi } from '@/features/google-conversions/api'
import { formatApiError } from '@/features/settings/components'

// ─── Dialog ───────────────────────────────────────────────────────────────────

type ImportBulkDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const PLACEHOLDER = `Customer ID|Tên Conversion|Conversion ID
706-350-4758|OutboundClickU|7530496784
706-350-4758|Purchase|1234567890`

export function ImportBulkDialog({ open, onOpenChange, onSuccess }: ImportBulkDialogProps) {
  const [lines, setLines] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (submitting) return
    if (!next) setLines('')
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    const trimmed = lines.trim()
    if (!trimmed) {
      toast.error('Vui lòng nhập dữ liệu trước khi import.')
      return
    }

    try {
      setSubmitting(true)
      const res = await googleConversionsApi.bulkImport(trimmed)
      const imported = res.data.data?.imported ?? 0
      toast.success(`Imported ${imported} record${imported === 1 ? '' : 's'} successfully`)
      handleOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Bulk Conversions</DialogTitle>
          <DialogDescription>
            Bulk data <span className="text-destructive">*</span>
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          placeholder={PLACEHOLDER}
          disabled={submitting}
          rows={10}
          className="resize-y font-mono text-xs"
        />

        <DialogFooter className="gap-2 sm:gap-2">
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
                Importing…
              </>
            ) : (
              <>
                <Upload className="size-3.5" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
