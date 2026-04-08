import { useState } from 'react'
import { Eye, ZoomIn } from 'lucide-react'

import type { Category } from '@/features/categories/types'
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type CategoryDetailDialogProps = {
  category: Category | null
  onOpenChange: (open: boolean) => void
}

export function CategoryDetailDialog({ category, onOpenChange }: CategoryDetailDialogProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <>
      <Dialog open={!!category} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Category Detail
            </DialogTitle>
          </DialogHeader>

          {category ? (
            <div className="flex flex-col gap-4">
              {category.feature_media?.url ? (
                <button
                  type="button"
                  className="group relative h-40 w-full overflow-hidden rounded-md border border-border"
                  onClick={() => setPreviewOpen(true)}
                >
                  <img
                    src={category.feature_media.url}
                    alt={category.feature_media.alt_text || category.name}
                    className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <ZoomIn className="h-6 w-6 text-white drop-shadow" />
                  </div>
                </button>
              ) : null}

              <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 text-sm">
                <span className="text-muted-foreground">ID</span>
                <span className="font-medium text-foreground">{category.id}</span>

                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-foreground">{category.name}</span>

                <span className="text-muted-foreground">Description</span>
                <span className="text-foreground">
                  {category.description ?? <span className="text-muted-foreground/50">—</span>}
                </span>

                <span className="text-muted-foreground">Created At</span>
                <span className="text-foreground">
                  {category.created_at ? (
                    new Date(category.created_at).toLocaleString()
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </span>

                <span className="text-muted-foreground">Updated At</span>
                <span className="text-foreground">
                  {category.updated_at ? (
                    new Date(category.updated_at).toLocaleString()
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ImagePreviewDialog
        src={category?.feature_media?.url}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  )
}
