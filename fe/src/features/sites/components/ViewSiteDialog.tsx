import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, Pencil, Trash2, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'

import { sitesApi } from '@/features/sites/api'
import type { SiteDetail } from '@/features/sites/types'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ViewSiteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: number | null
  canUpdate: boolean
  canDelete: boolean
  onEditClick: (siteId: number) => void
  onDeleteClick: (siteId: number) => void
}

export function ViewSiteDialog({
  open,
  onOpenChange,
  siteId,
  canUpdate,
  canDelete,
  onEditClick,
  onDeleteClick,
}: ViewSiteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<SiteDetail | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (open && siteId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true)
      sitesApi
        .getDetail(siteId)
        .then((res) => {
          setDetail(res.data.data)
        })
        .catch((err) => {
          toast.error(formatApiError(err))
          onOpenChange(false)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setDetail(null)
    }
  }, [open, siteId, onOpenChange])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[90vh] overflow-hidden flex-col gap-0 p-0 sm:max-w-[700px]">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-start justify-between pr-4">
              <div>
                <DialogTitle>View Site</DialogTitle>
                <DialogDescription>View detailed information about this site.</DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {canUpdate && detail ? (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => {
                      onOpenChange(false)
                      onEditClick(detail.id)
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                ) : null}
                {canDelete && detail ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => {
                      onOpenChange(false)
                      onDeleteClick(detail.id)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm">Loading details...</span>
              </div>
            </div>
          ) : detail ? (
            <ScrollArea className="flex-1 min-h-0 px-6">
              <div className="grid gap-8 pb-6">
                {/* Basic Info */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="text-lg font-medium">{detail.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Status</Label>
                    <div>
                      <StatusBadge status={detail.status} />
                    </div>
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
                            className="group relative flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 transition-colors hover:bg-muted/50"
                          >
                            <img
                              src={detail.logo.url}
                              alt="Site Logo"
                              className="max-h-[120px] object-contain"
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/20">
                              <ZoomIn className="size-6 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                            </div>
                          </button>
                        </div>
                      )}
                      {detail.favicon && (
                        <div className="space-y-3">
                          <Label className="text-muted-foreground">Favicon File</Label>
                          <button
                            type="button"
                            onClick={() =>
                              detail.favicon?.url && setPreviewImage(detail.favicon.url)
                            }
                            className="group relative flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 transition-colors hover:bg-muted/50"
                          >
                            <img
                              src={detail.favicon.url}
                              alt="Site Favicon"
                              className="max-h-[120px] object-contain"
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/20">
                              <ZoomIn className="size-6 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Settings */}
                {(detail.settings?.gtm || detail.settings?.theme) && (
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
                <div className="grid gap-6 text-sm text-muted-foreground sm:grid-cols-2">
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
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>

      <ImagePreviewDialog
        src={previewImage}
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </>
  )
}
