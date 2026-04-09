import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Trash2,
  ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'

import { postsApi } from '@/features/posts/api'
import { DeletePostDialog } from '@/features/posts/components'
import type { Post } from '@/features/posts/types'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PATHS, postEditPath } from '@/constants/paths'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { cn } from '@/lib/utils'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div>{children}</div>
    </div>
  )
}

export function ViewPostPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)
  const canUpdate = hasPermission(user?.permissions ?? [], PermissionSlugs.PostsUpdate)
  const canDelete = hasPermission(user?.permissions ?? [], PermissionSlugs.PostsDelete)

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchDetail = async () => {
      try {
        const res = await postsApi.getDetail(Number(id))
        setPost(res.data.data)
      } catch (err) {
        const msg = formatApiError(err)
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    void fetchDetail()
  }, [id])

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Post Detail</h1>
          <p className="mt-1 text-sm text-muted-foreground">Read-only view of the post.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => void navigate(PATHS.posts)}>
            <ArrowLeft className="size-4" />
            Back to Posts
          </Button>
          {canUpdate && post ? (
            <Button className="gap-1.5" onClick={() => void navigate(postEditPath(post.id))}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
          {canDelete && post ? (
            <Button
              variant="destructive"
              className="gap-1.5"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <Card className="flex min-h-[400px] flex-col items-center justify-center border-border shadow-none">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        </Card>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : post ? (
        <Card className="overflow-hidden border-border shadow-none">
          <CardContent className="p-6">
            <div className="grid gap-8">
              {/* Feature image */}
              {post.feature_media?.url && (
                <button
                  type="button"
                  onClick={() => setPreviewImage(post.feature_media!.url)}
                  className="group relative overflow-hidden rounded-lg border border-border bg-muted/30 transition-colors hover:bg-muted/50"
                >
                  <img
                    src={post.feature_media.url}
                    alt={post.title}
                    className="max-h-64 w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <ZoomIn className="size-6 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                  </div>
                </button>
              )}

              {/* Status + visibility row */}
              <div className="flex flex-wrap items-center gap-3">
                {post.status && <StatusBadge status={post.status} />}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                    post.is_hidden
                      ? 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-900'
                      : 'bg-muted text-muted-foreground ring-border',
                  )}
                >
                  {post.is_hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  {post.is_hidden ? 'Hidden' : 'Visible'}
                </span>
                {post.type && (
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
                    {post.type}
                  </span>
                )}
                {post.lang && (
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium uppercase text-muted-foreground ring-1 ring-inset ring-border">
                    {post.lang}
                  </span>
                )}
              </div>

              {/* Core fields */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Title
                  </Label>
                  <p className="text-xl font-semibold text-foreground">{post.title}</p>
                </div>

                <Field label="Slug">
                  <p className="font-mono text-sm text-muted-foreground">{post.slug}</p>
                </Field>

                <Field label="Category">
                  {post.category ? (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
                      {post.category.name}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">—</span>
                  )}
                </Field>

                {post.description && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Description
                    </Label>
                    <p className="whitespace-pre-wrap text-sm text-foreground/80">
                      {post.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Content */}
              {post.content && (
                <>
                  <div className="h-px bg-border" />
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Content
                    </Label>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border bg-muted/20 p-4 text-sm"
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                  </div>
                </>
              )}

              {/* Metadata */}
              <div className="h-px bg-border" />
              <div className="grid gap-6 sm:grid-cols-2 text-sm text-muted-foreground">
                {post.published_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground/70">Published</p>
                      <p>{new Date(post.published_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="font-medium text-foreground/70">Created</p>
                  <p>{new Date(post.created_at).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground/70">Last Updated</p>
                  <p>{new Date(post.updated_at).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground/70">ID</p>
                  <p className="font-mono">{post.id}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ImagePreviewDialog
        src={previewImage}
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />

      <DeletePostDialog
        post={deleteDialogOpen ? post : null}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={() => void navigate(PATHS.posts)}
      />
    </div>
  )
}
