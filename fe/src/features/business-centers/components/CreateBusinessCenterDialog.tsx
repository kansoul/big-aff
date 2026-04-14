import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { businessCentersApi } from '@/features/business-centers/api'
import {
  businessCenterCreateSchema,
  type BusinessCenterCreateFormValues,
} from '@/features/business-centers/types'
import { BusinessCenterFormSections } from '@/features/business-centers/components/BusinessCenterFormSections'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const DEFAULT_VALUES = {
  bc_id: '',
  name: '',
  ads_type: undefined,
  team_id: null,
} as unknown as BusinessCenterCreateFormValues

export function CreateBusinessCenterDialog({ open, onOpenChange, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const createMoreRef = useRef(false)

  const form = useForm<BusinessCenterCreateFormValues>({
    resolver: zodResolver(businessCenterCreateSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const onSubmit = async (values: BusinessCenterCreateFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await businessCentersApi.create(values)
      toast.success('Business center created successfully')
      onSuccess()
      if (createMoreRef.current) {
        form.reset(DEFAULT_VALUES)
      } else {
        onOpenChange(false)
      }
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
      createMoreRef.current = false
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset(DEFAULT_VALUES)
      setFormError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Business Center</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e)
            }}
            className="flex flex-col gap-4"
          >
            <BusinessCenterFormSections control={form.control} />

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
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={submitting}
                className="gap-1.5"
                onClick={() => {
                  createMoreRef.current = true
                }}
              >
                {submitting && createMoreRef.current ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>Create &amp; Create Another</>
                )}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-1.5"
                onClick={() => {
                  createMoreRef.current = false
                }}
              >
                {submitting && !createMoreRef.current ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Create
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
