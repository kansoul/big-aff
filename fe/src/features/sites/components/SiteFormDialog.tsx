import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { sitesApi } from '@/features/sites/api'
import {
  siteCreateSchema,
  type SiteCreateFormValues,
  type SiteDetail,
} from '@/features/sites/types'
import { SiteFormSections } from '@/features/sites/components/SiteFormSections'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SiteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: number | null
  onSuccess: () => void
  canCreate: boolean
  canUpdate: boolean
}

export function SiteFormDialog({
  open,
  onOpenChange,
  siteId,
  onSuccess,
  canCreate,
  canUpdate,
}: SiteFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isEdit = siteId !== null

  const form = useForm<SiteCreateFormValues>({
    resolver: zodResolver(siteCreateSchema) as Resolver<SiteCreateFormValues>,
    defaultValues: {
      name: '',
      url: '',
      description: '',
      status: 'active',
      logo: null,
      favicon: null,
      settings: { gtm: '', theme: '', default_channel: '', default_style: '' },
    },
  })

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormError(null)
      if (siteId) {
        setLoading(true)
        sitesApi
          .getDetail(siteId)
          .then((res) => {
            const site: SiteDetail = res.data.data
            form.reset({
              name: site.name,
              url: site.url,
              description: site.description ?? '',
              status: site.status,
              logo: site.logo ?? null,
              favicon: site.favicon ?? null,
              settings: {
                gtm: site.settings?.gtm ?? '',
                theme: site.settings?.theme ?? '',
                default_channel: site.settings?.default_channel ?? '',
                default_style: site.settings?.default_style ?? '',
              },
            })
          })
          .catch((err) => {
            toast.error(formatApiError(err))
            onOpenChange(false)
          })
          .finally(() => {
            setLoading(false)
          })
      } else {
        form.reset({
          name: '',
          url: '',
          description: '',
          status: 'active',
          logo: null,
          favicon: null,
          settings: { gtm: '', theme: '', default_channel: '', default_style: '' },
        })
      }
    } else {
      form.reset()
    }
  }, [open, siteId, form, onOpenChange])

  const onSubmit = async (values: SiteCreateFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      const logo_id = values.logo?.id ?? null
      const favicon_id = values.favicon?.id ?? null

      if (isEdit && siteId) {
        await sitesApi.update(siteId, { ...values, logo_id, favicon_id })
        toast.success('Site updated successfully')
      } else {
        await sitesApi.create({ ...values, logo_id, favicon_id })
        toast.success('Site created successfully')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const hasPermission = isEdit ? canUpdate : canCreate

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] overflow-hidden flex-col gap-0 p-0 sm:max-w-[700px]">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{isEdit ? 'Edit Site' : 'Create Site'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update site details and configuration.' : 'Add a new site to the system.'}
          </DialogDescription>
        </DialogHeader>

        {!hasPermission ? (
          <div className="flex h-[300px] items-center justify-center p-6 text-center text-muted-foreground">
            You do not have permission to perform this action.
          </div>
        ) : loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-sm">Loading details...</span>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={(e) => {
                void form.handleSubmit(onSubmit)(e)
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <ScrollArea className="flex-1 min-h-0 px-6">
                <div className="flex flex-col gap-6 pb-6">
                  <SiteFormSections control={form.control} />

                  {formError ? (
                    <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p>{formError}</p>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => onOpenChange(false)}
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
                      {isEdit ? 'Save Changes' : 'Create Site'}
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
