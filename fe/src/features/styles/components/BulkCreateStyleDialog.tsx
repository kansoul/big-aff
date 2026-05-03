import type { UseFormReturn } from 'react-hook-form'
import { AlertCircle } from 'lucide-react'

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
import { Textarea } from '@/components/ui/textarea'
import type { StyleBulkCreateFormValues } from '@/features/styles/types'

type BulkCreateStyleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: UseFormReturn<StyleBulkCreateFormValues>
  submitting: boolean
  formError: string | null
  importErrors: string[]
  onSubmit: (values: StyleBulkCreateFormValues) => void | Promise<void>
  onSubmitAnother: (values: StyleBulkCreateFormValues) => void | Promise<void>
}

export function BulkCreateStyleDialog({
  open,
  onOpenChange,
  form,
  submitting,
  formError,
  importErrors,
  onSubmit,
  onSubmitAnother,
}: BulkCreateStyleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            Create Styles
          </DialogTitle>
        </DialogHeader>

        {formError && open ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{formError}</p>
          </div>
        ) : null}

        {importErrors.length > 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 space-y-1">
            <p className="font-medium">Some lines had errors:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {importErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="lines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Styles *</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={20}
                      className="min-h-50"
                      placeholder={'Style 1|1123123123\nStyle 2|1123123124'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-2 shrink-0 gap-2 border-0 bg-transparent sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void form.handleSubmit(onSubmitAnother)()}
              >
                {submitting ? 'Creating…' : 'Create & create another'}
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void form.handleSubmit(onSubmit)()}
              >
                {submitting ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
