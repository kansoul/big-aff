import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { postsApi } from '@/features/posts/api'
import { PostFormSections } from '@/features/posts/components'
import { postFormSchema, type PostFormValues } from '@/features/posts/types'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { categoriesApi } from '@/features/categories/api'
import type { Category } from '@/features/categories/types'
import { PATHS } from '@/constants/paths'

export function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    void categoriesApi
      .list(1, 100, {
        query: null,
        parent_id: null,
        order_by: 'name',
        order: 'asc',
      })
      .then((res) => {
        setCategories(res.data.data)
      })
  }, [])

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema) as any,
    defaultValues: {
      title: '',
      slug: '',
      lang: null,
      description: null,
      content: null,
      feature_media: null,
      status: 'draft',
      is_hidden: false,
      type: null,
      category_id: null,
      published_at: null,
    },
  })

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setLoadError(null)
    postsApi
      .getDetail(Number(id))
      .then((res) => {
        const p = res.data.data
        form.reset({
          title: p.title,
          slug: p.slug,
          lang: p.lang ?? null,
          description: p.description ?? null,
          content: p.content ?? null,
          feature_media: p.feature_media ?? null,
          status: p.status ?? 'draft',
          is_hidden: p.is_hidden ?? false,
          type: p.type ?? null,
          category_id: p.category_id ?? null,
          published_at: p.published_at ? p.published_at.slice(0, 10) : null,
        })
      })
      .catch((err) => {
        setLoadError(formatApiError(err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id, form])

  const onSubmit = async (values: PostFormValues) => {
    if (!id) return
    try {
      setFormError(null)
      setSubmitting(true)
      await postsApi.update(Number(id), values)
      toast.success('Post updated successfully')
      void navigate(PATHS.posts)
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
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

  if (loadError) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <p>{loadError}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => void navigate(PATHS.posts)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Back to Posts</span>
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e)
          }}
          className="flex flex-col gap-6"
        >
          <PostFormSections
            control={form.control}
            watch={form.watch}
            setValue={form.setValue}
            categories={categories}
            disableAutoSlug
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
              onClick={() => void navigate(PATHS.posts)}
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
    </div>
  )
}
