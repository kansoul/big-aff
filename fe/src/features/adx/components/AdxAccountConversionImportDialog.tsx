import { useCallback, useState } from 'react'
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
import { adxApi } from '@/features/adx/api'
import { formatApiError } from '@/features/settings/components'

type AdxAccountConversionImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const PLACEHOLDER = `Customer ID|Tên Conversion|Conversion ID
706-350-4758|LandingViewU|7530496784
706-350-4758|GetGameLinkClickU|7530496785
706-350-4758|DetailViewU|7530496786
706-350-4758|GetBonusClickU|7530496787
706-350-4758|InterClickAdU|7530496788
706-350-4758|RewardClickAdU|7530496789
706-350-4758|BannerClickAdU|7530496790`

export function AdxAccountConversionImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: AdxAccountConversionImportDialogProps) {
  const [lines, setLines] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (submitting) return
      if (!next) setLines('')
      onOpenChange(next)
    },
    [onOpenChange, submitting],
  )

  const handleSubmit = useCallback(async () => {
    const trimmed = lines.trim()
    if (!trimmed) {
      toast.error('Vui lòng nhập dữ liệu trước khi import.')
      return
    }

    try {
      setSubmitting(true)
      const res = await adxApi.bulkImportAccountConversions(trimmed)
      const processed = res.data.data.processed
      const skipped = res.data.data.skipped
      toast.success(
        `Imported ${processed} record${processed === 1 ? '' : 's'} successfully${
          skipped > 0 ? `, skipped ${skipped}` : ''
        }`,
      )
      handleOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }, [handleOpenChange, lines, onSuccess])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-1rem)] w-full max-w-lg flex-col overflow-hidden sm:max-h-[90vh] sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Import Bulk AdX Conversions</DialogTitle>
          <DialogDescription>
            Bulk data <span className="text-destructive">*</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          <Textarea
            value={lines}
            onChange={(event) => setLines(event.target.value)}
            placeholder={PLACEHOLDER}
            disabled={submitting}
            rows={10}
            className="max-h-[50vh] resize-none overflow-y-auto font-mono text-xs field-sizing-fixed sm:min-h-60"
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
                Importing...
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
