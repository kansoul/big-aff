import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Eye, Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { sitesApi } from '@/features/sites/api'
import {
  siteCreateSchema,
  type SiteCreateFormValues,
  type SiteDetail,
} from '@/features/sites/types'
import { SiteFormSections } from '@/features/sites/components/SiteFormSections'
import { DeleteSiteDialog } from '@/features/sites/components/DeleteSiteDialog'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { PATHS, siteViewPath } from '@/constants/paths'
import { useAuthStore } from '@/hooks/useAuthStore'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'

export function EditSitePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  const [existingFaviconUrl, setExistingFaviconUrl] = useState<string | null>(null)

  const [siteData, setSiteData] = useState<SiteDetail | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canDelete = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsSitesDelete),
    [perms],
  )

  const form = useForm<SiteCreateFormValues>({
    resolver: zodResolver(siteCreateSchema),
    defaultValues: {
      name: '',
      url: '',
      description: '',
      status: undefined,
      logo: null,
      favicon: null,
      settings: { gtm: '', fb_pixel: '', theme: '' },
    },
  })

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await sitesApi.getDetail(Number(id))
        const site: SiteDetail = res.data.data
        setSiteData(site)
        form.reset({
          name: site.name,
          url: site.url,
          description: site.description ?? '',
          status: site.status,
          logo: null,
          favicon: null,
          settings: {
            gtm: site.settings?.gtm ?? '',
            fb_pixel: site.settings?.fb_pixel ?? '',
            theme: site.settings?.theme ?? '',
          },
        })
        setExistingLogoUrl(site.logo?.url ?? null)
        setExistingFaviconUrl(site.favicon?.url ?? null)
      } catch (err) {
        toast.error(formatApiError(err))
        void navigate(PATHS.settingsSites)
      } finally {
        setLoading(false)
      }
    }
    void fetchDetail()
  }, [id, form, navigate])

  const onSubmit = async (values: SiteCreateFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await sitesApi.update(Number(id), values)
      toast.success('Site updated successfully')
      void navigate(PATHS.settingsSites)
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onConfirmDelete = async () => {
    if (!siteData) return
    try {
      setDeleting(true)
      await sitesApi.delete(siteData.id)
      toast.success(`Site "${siteData.name}" deleted.`)
      setDeleteDialogOpen(false)
      void navigate(PATHS.settingsSites)
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              void navigate(PATHS.settingsSites)
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Back to Sites</span>
        </div>
        <div className="flex items-center gap-2">
          {siteData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={submitting || deleting}
              onClick={() => {
                void navigate(siteViewPath(siteData.id))
              }}
            >
              <Eye className="h-3.5 w-3.5" />
              View Detail
            </Button>
          )}
          {canDelete && siteData ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1.5"
              disabled={submitting || deleting}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Site
            </Button>
          ) : null}
        </div>
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
            existingLogoUrl={existingLogoUrl}
            existingFaviconUrl={existingFaviconUrl}
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
              onClick={() => {
                void navigate(PATHS.settingsSites)
              }}
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

      <DeleteSiteDialog
        site={deleteDialogOpen ? siteData : null}
        onOpenChange={setDeleteDialogOpen}
        deleting={deleting}
        onConfirmDelete={onConfirmDelete}
      />
    </div>
  )
}
