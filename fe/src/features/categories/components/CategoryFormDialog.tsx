import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { categoriesApi } from '@/features/categories/api'
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type Category,
  type CategoryCreateFormValues,
  type CategoryUpdateFormValues,
} from '@/features/categories/types'
import { formatApiError } from '@/features/settings/components'
import { mediaApi } from '@/features/media/api'
import type { MediaFile } from '@/features/media/types'
import { MediaPickerField } from '@/components/common/MediaPickerDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type CategoryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, dialog is in edit mode. */
  category?: Category | null
  onSuccess: () => void
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormDialogProps) {
  const isEdit = !!category
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<CategoryCreateFormValues>({
    resolver: zodResolver(isEdit ? categoryUpdateSchema : categoryCreateSchema) as any,
    defaultValues: {
      name: '',
      description: null,
      feature_image: null,
    },
  })

  useEffect(() => {
    if (open) {
      setFormError(null)
      if (category) {
        form.reset({
          name: category.name,
          description: category.description ?? null,
          feature_image: category.feature_media,
        })
      } else {
        form.reset({
          name: '',
          description: null,
          feature_image: null,
        })
      }
    }
  }, [open, category, form])

  const onSubmit = async (values: CategoryCreateFormValues | CategoryUpdateFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)

      // Resolve media: upload if new File, extract ID if existing MediaFile
      let resolvedMediaId: number | null = null
      if (values.feature_image instanceof File) {
        const res = await mediaApi.upload(values.feature_image, {})
        resolvedMediaId = res.data.data.id
      } else if (
        values.feature_image &&
        typeof values.feature_image === 'object' &&
        'id' in values.feature_image
      ) {
        resolvedMediaId = (values.feature_image as MediaFile).id
      }

      if (isEdit && category) {
        await categoriesApi.update(category.id, {
          name: values.name,
          description: values.description,
          parent_id: values.parent_id,
          feature_media_id: resolvedMediaId,
        })
        toast.success('Category updated successfully')
      } else {
        await categoriesApi.create({
          name: values.name,
          description: values.description,
          parent_id: values.parent_id,
          feature_media_id: resolvedMediaId,
        })
        toast.success('Category created successfully')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e)
            }}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Category name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short description…"
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <MediaPickerField
              control={form.control}
              name="feature_image"
              label="Feature Image"
              accept="image/*"
              placeholder="Select feature image…"
            />

            {formError ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{formError}</p>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
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
                    {isEdit ? 'Save Changes' : 'Create Category'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
