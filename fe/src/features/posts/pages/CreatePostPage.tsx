import { useCallback, useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { postsApi } from '@/features/posts/api'
import { PostFormSections } from '@/features/posts/components'
import { postFormSchema, type PostFormValues } from '@/features/posts/types'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { categoriesApi } from '@/features/categories/api'
import { CategoryFormDialog } from '@/features/categories/components'
import type { Category } from '@/features/categories/types'
import { PATHS } from '@/constants/paths'
import { useAuthStore } from '@/hooks/useAuthStore'
import { hasPermission, PermissionSlugs } from '@/constants/permissions'

export function CreatePostPage() {
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions ?? []
  const canCreateKeywordSet = hasPermission(perms, PermissionSlugs.KeywordSetsCreate)
  const canUpdateKeywordSet = hasPermission(perms, PermissionSlugs.KeywordSetsUpdate)
  const canDeleteKeywordSet = hasPermission(perms, PermissionSlugs.KeywordSetsDelete)
  const canPublish = hasPermission(perms, PermissionSlugs.PostsPublish)
  const canCreateCategory = hasPermission(perms, PermissionSlugs.CategoriesCreate)

  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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
      keyword_set_ids: null,
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

  const onSubmit = async (values: PostFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await postsApi.create({
        ...values,
        feature_media_id: values.feature_media?.id ?? null,
      })
      toast.success('Post created successfully')
      void navigate(PATHS.posts)
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
          size="sm"
          className="h-8 gap-1.5 px-2 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Back to Posts"
          onClick={() => void navigate(PATHS.posts)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Posts
        </Button>
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
                  Create Post
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
