import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { sitesApi } from '@/features/sites/api'
import { siteCreateSchema, type SiteCreateFormValues } from '@/features/sites/types'
import { SiteFormSections } from '@/features/sites/components/SiteFormSections'
import { formatApiError } from '@/features/settings/components'
import { mediaApi } from '@/features/media/api'
import type { MediaFile } from '@/features/media/types'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { PATHS } from '@/constants/paths'
import type { UploadMeta } from '@/components/common/MediaPickerDialog'

const DEFAULT_META: UploadMeta = { alt_text: null, directory: null }

export function CreateSitePage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [logoMeta, setLogoMeta] = useState<UploadMeta>(DEFAULT_META)
  const [faviconMeta, setFaviconMeta] = useState<UploadMeta>(DEFAULT_META)

  const form = useForm<SiteCreateFormValues>({
    resolver: zodResolver(siteCreateSchema) as any, // TODO: fix zodResolver type
    defaultValues: {
      name: '',
      url: '',
      description: '',
      status: 'active',
      logo: null,
      favicon: null,
      settings: { gtm: '', fb_pixel: '', theme: '', default_channel: '', default_style: '' },
    },
  })

  const resolveMediaId = async (
    value: MediaFile | File | null | undefined,
    meta: UploadMeta,
  ): Promise<number | null> => {
    if (value instanceof File) {
      const res = await mediaApi.upload(value, meta)
      return res.data.data.id
    }
    return (value as MediaFile | null)?.id ?? null
  }

  const onSubmit = async (values: SiteCreateFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      const [logo_id, favicon_id] = await Promise.all([
        resolveMediaId(values.logo, logoMeta),
        resolveMediaId(values.favicon, faviconMeta),
      ])
      await sitesApi.create({ ...values, logo_id, favicon_id })
      toast.success('Site created successfully')
      void navigate(PATHS.settingsSites)
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
          onClick={() => void navigate(PATHS.settingsSites)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Back to Sites</span>
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e)
          }}
          className="flex flex-col gap-6"
        >
          <SiteFormSections
            control={form.control}
            onLogoMeta={setLogoMeta}
            onFaviconMeta={setFaviconMeta}
          />

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
              onClick={() => void navigate(PATHS.settingsSites)}
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
                  Create Site
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
