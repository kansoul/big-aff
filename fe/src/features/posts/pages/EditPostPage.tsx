import { useCallback, useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Eye, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { postsApi } from '@/features/posts/api'
import { PostFormSections } from '@/features/posts/components'
import { postFormSchema, type PostFormValues, type KeywordSet } from '@/features/posts/types'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { categoriesApi } from '@/features/categories/api'
import { CategoryFormDialog } from '@/features/categories/components'
import type { Category } from '@/features/categories/types'
import { PATHS, postViewPath } from '@/constants/paths'
import { useAuthStore } from '@/hooks/useAuthStore'
import { hasPermission, PermissionSlugs } from '@/constants/permissions'

export function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions ?? []
  const canCreateKeywordSet = hasPermission(perms, PermissionSlugs.KeywordSetsCreate)
  const canUpdateKeywordSet = hasPermission(perms, PermissionSlugs.KeywordSetsUpdate)
  const canDeleteKeywordSet = hasPermission(perms, PermissionSlugs.KeywordSetsDelete)
  const canPublish = hasPermission(perms, PermissionSlugs.PostsPublish)
  const canCreateCategory = hasPermission(perms, PermissionSlugs.CategoriesCreate)

  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [postKeywordSets, setPostKeywordSets] = useState<KeywordSet[]>([])

  const loadCategories = useCallback(async () => {
    const res = await categoriesApi.list({
      page: 1,
      per_page: 100,
      query: null,
      parent_id: null,
      order_by: 'name',
      order: 'asc',
    })
    setCategories(res.data.data)
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema) as Resolver<PostFormValues>,
    defaultValues: {
      title: '',
      slug: '',
      lang: null,
      note: null,
      description: null,
      content: null,
      feature_media: null,
      status: 'draft',
      is_hidden: false,
      type: 'normal',
      category_id: null,
      published_at: null,
    },
  })

  const onCategoryCreated = useCallback(
    (category?: Category) => {
      if (category) {
        setCategories((prev) => {
          const next = prev.filter((item) => item.id !== category.id)
          return [...next, category].sort((a, b) => a.name.localeCompare(b.name))
        })
        form.setValue('category_id', category.id, { shouldDirty: true, shouldValidate: true })
      }

      void loadCategories()
    },
    [form, loadCategories],
  )

  const loadPost = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await postsApi.getDetail(Number(id))
      const p = res.data.data
      const kSets = p.keyword_sets ?? []
      setPostKeywordSets(kSets)
      form.reset({
        title: p.title,
        slug: p.slug,
        lang: p.lang ?? null,
        note: p.note ?? null,
        description: p.description ?? null,
        content: p.content ?? null,
        feature_media: p.feature_media ?? null,
        status: p.status ?? 'draft',
        is_hidden: p.is_hidden ?? false,
        type: p.type ?? 'normal',
        category_id: p.category_id ?? null,
        published_at: p.published_at ? p.published_at.slice(0, 10) : null,
        keyword_set_ids: kSets.length > 0 ? kSets.map((ks) => ks.id) : null,
      })
    } catch (err) {
      setLoadError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [id, form])

  useEffect(() => {
    void loadPost()
  }, [loadPost])

  const onSubmit = async (values: PostFormValues) => {
    if (!id) return
    try {
      setFormError(null)
      setSubmitting(true)
      await postsApi.update(Number(id), {
        ...values,
        feature_media_id: values.feature_media?.id ?? null,
      })
      toast.success('Post updated successfully')
      await loadPost()
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-sm text-muted-foreground hover:text-foreground"
            aria-label="Back to Posts"
            onClick={() => void navigate(PATHS.posts)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Posts
          </Button>
        </div>
        {id ? (
          <Button type="button" size="sm" onClick={() => void navigate(postViewPath(id))}>
            <Eye className="h-3.5 w-3.5" />
            View Detail
          </Button>
        ) : null}
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
            autoSlug
            categories={categories}
            defaultKeywordSets={postKeywordSets}
            canCreateKeywordSet={canCreateKeywordSet}
            canUpdateKeywordSet={canUpdateKeywordSet}
            canDeleteKeywordSet={canDeleteKeywordSet}
            canPublish={canPublish}
            canCreateCategory={canCreateCategory}
            onCreateCategoryClick={() => setCategoryFormOpen(true)}
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

      <CategoryFormDialog
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        onSuccess={onCategoryCreated}
      />
    </div>
  )
}
