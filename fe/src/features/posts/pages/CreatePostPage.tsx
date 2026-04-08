import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import type { Category } from '@/features/categories/types'
import { PATHS } from '@/constants/paths'

export function CreatePostPage() {
  const navigate = useNavigate()
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

  const onSubmit = async (values: PostFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await postsApi.create(values)
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
    </div>
  )
}
