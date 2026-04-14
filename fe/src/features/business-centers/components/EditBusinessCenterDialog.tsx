import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { businessCentersApi } from '@/features/business-centers/api'
import {
  businessCenterCreateSchema,
  type BusinessCenter,
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
  businessCenter: BusinessCenter | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditBusinessCenterDialog({ businessCenter, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<BusinessCenterCreateFormValues>({
    resolver: zodResolver(businessCenterCreateSchema),
    defaultValues: {
      bc_id: '',
      name: '',
      ads_type: undefined,
      team_id: null,
    },
  })

  useEffect(() => {
    if (!businessCenter) return
    const fetchData = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await businessCentersApi.get(businessCenter.id)
        const bc: BusinessCenter = res.data.data
        form.reset({
          bc_id: bc.bc_id,
          name: bc.name,
          ads_type: bc.ads_type,
          team_id: bc.team_id ?? null,
        })
      } catch (err) {
        setLoadError(formatApiError(err))
      } finally {
        setLoading(false)
      }
    }
    void fetchData()
  }, [businessCenter, form])

  const onSubmit = async (values: BusinessCenterCreateFormValues) => {
    if (!businessCenter) return
    try {
      setFormError(null)
      setSubmitting(true)
      await businessCentersApi.update(businessCenter.id, values)
      toast.success('Business center updated successfully')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset()
      setFormError(null)
      setLoadError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={!!businessCenter} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Business Center</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{loadError}</p>
          </div>
        ) : (
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
                <Button type="submit" disabled={submitting} className="gap-1.5">
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
