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
import { gtagsApi } from '@/features/gtags/api'
import { formatApiError } from '@/features/settings/components'

// ─── Dialog ───────────────────────────────────────────────────────────────────

type ImportBulkDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const PLACEHOLDER = `Customer ID|Code|Tên Conversion|Conversion ID
706-350-4758|AW-123456789|OutboundClickU|7530496784
706-350-4758|AW-123456789|ArticleViewU|1234567890`

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
      const res = await gtagsApi.bulkImport(trimmed)
      const processed = res.data.data?.processed ?? 0
      toast.success(`Imported ${processed} record${processed === 1 ? '' : 's'} successfully`)
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
      <DialogContent className="flex max-h-[calc(100vh-1rem)] w-full max-w-lg flex-col overflow-hidden sm:max-h-[90vh] sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Import Bulk Gtags</DialogTitle>
          <DialogDescription>
            Bulk data <span className="text-destructive">*</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          <Textarea
            value={lines}
            onChange={(e) => setLines(e.target.value)}
            placeholder={PLACEHOLDER}
            disabled={submitting}
            rows={10}
            className="max-h-[50vh] resize-none overflow-y-auto font-mono text-xs [field-sizing:fixed] sm:min-h-60"
          />
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
