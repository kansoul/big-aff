import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react'
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
import { PATHS } from '@/constants/paths'

export function EditBusinessCenterPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
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
    if (!id) return
    const fetchData = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await businessCentersApi.get(Number(id))
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
  }, [id, form])

  const onSubmit = async (values: BusinessCenterCreateFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await businessCentersApi.update(Number(id), values)
      toast.success('Business center updated successfully')
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => void navigate(PATHS.businessCenters)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Back to Business Centers</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-sm text-muted-foreground">
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
            className="flex flex-col gap-6"
          >
            <BusinessCenterFormSections control={form.control} />

            {formError ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{formError}</p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => void navigate(PATHS.businessCenters)}
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
            </div>
          </form>
        </Form>
      )}
    </div>
  )
}
