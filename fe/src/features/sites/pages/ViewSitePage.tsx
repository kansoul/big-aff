import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { sitesApi } from '@/features/sites/api'
import type { SiteDetail } from '@/features/sites/types'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { PATHS } from '@/constants/paths'
import { cn } from '@/lib/utils'

export function ViewSitePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<SiteDetail | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true)
        const res = await sitesApi.getDetail(Number(id))
        setDetail(res.data.data)
      } catch (err) {
        toast.error(formatApiError(err))
        void navigate(PATHS.settingsSites)
      } finally {
        setLoading(false)
      }
    }
    void fetchDetail()
  }, [id, navigate])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">View Site</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View detailed information about this site.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => void navigate(PATHS.settingsSites)}
          >
            <ArrowLeft className="size-4" />
            Back to Sites
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="flex min-h-[400px] flex-col items-center justify-center border-border shadow-none">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading detail…</p>
        </Card>
      ) : detail ? (
        <Card className="overflow-hidden border-border shadow-none">
          <CardContent className="p-6">
            <div className="grid gap-8">
              {/* Basic Info */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">ID</Label>
                  <p className="font-medium">{detail.id}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize',
                        {
                          'bg-primary/10 text-primary ring-primary/20': detail.status === 'active',
                          'bg-muted text-muted-foreground ring-border':
                            detail.status === 'maintenance',
                          'bg-destructive/10 text-destructive ring-destructive/20':
                            detail.status === 'suspended',
                        },
                      )}
                    >
                      {detail.status}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium text-lg">{detail.name}</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-muted-foreground">URL</Label>
                  <div className="flex items-center gap-2">
                    <a
                      href={detail.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {detail.url}
                    </a>
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </div>
                </div>
                {detail.description && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="whitespace-pre-wrap">{detail.description}</p>
                  </div>
                )}
              </div>

              {/* Media */}
              {(detail.logo || detail.favicon) && (
                <>
                  <div className="h-px bg-border" />
                  <div className="grid gap-6 sm:grid-cols-2">
                    {detail.logo && (
                      <div className="space-y-3">
                        <Label className="text-muted-foreground">Logo File</Label>
                        <button
                          type="button"
                          onClick={() => detail.logo?.url && setPreviewImage(detail.logo.url)}
                          className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 transition-colors hover:bg-muted/50"
                        >
                          <img
                            src={detail.logo.url}
                            alt="Site Logo"
                            className="max-h-[120px] object-contain"
                          />
                        </button>
                      </div>
                    )}
                    {detail.favicon && (
                      <div className="space-y-3">
                        <Label className="text-muted-foreground">Favicon File</Label>
                        <button
                          type="button"
                          onClick={() => detail.favicon?.url && setPreviewImage(detail.favicon.url)}
                          className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 transition-colors hover:bg-muted/50"
                        >
                          <img
                            src={detail.favicon.url}
                            alt="Site Favicon"
                            className="max-h-[120px] object-contain"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Settings */}
              {(detail.settings?.gtm || detail.settings?.fb_pixel || detail.settings?.theme) && (
                <>
                  <div className="h-px bg-border" />
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <h3 className="text-lg font-medium">Settings</h3>
                    </div>
                    {detail.settings?.gtm && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">GTM ID</Label>
                        <p className="font-mono text-sm">{detail.settings.gtm}</p>
                      </div>
                    )}
                    {detail.settings?.fb_pixel && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">FB Pixel</Label>
                        <p className="font-mono text-sm">{detail.settings.fb_pixel}</p>
                      </div>
                    )}
                    {detail.settings?.theme && (
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-muted-foreground">Theme configuration</Label>
                        <p className="font-mono text-sm">{detail.settings.theme}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* System Metadata */}
              <div className="h-px bg-border" />
              <div className="grid gap-6 sm:grid-cols-2 text-sm text-muted-foreground">
                <div className="space-y-1">
                  <p className="font-medium">Created</p>
                  <p>{new Date(detail.created_at).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Last Updated</p>
                  <p>{new Date(detail.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="border-none bg-transparent p-0 shadow-none sm:max-w-[90vw] md:w-auto h-auto max-h-[90vh]">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImage && (
            <div className="flex items-center justify-center overflow-hidden rounded-md">
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-[85vh] max-w-full rounded-md object-contain shadow-2xl"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
