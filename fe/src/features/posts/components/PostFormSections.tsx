import { useEffect } from 'react'
import type { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form'

import type { Category } from '@/features/categories/types'
import type { PostFormValues } from '@/features/posts/types'
import { MediaPickerField, type UploadMeta } from '@/components/common/MediaPickerDialog'
import { TextEditorField, type TextEditorHandle } from '@/components/common/TextEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

type PostFormSectionsProps = {
  control: Control<PostFormValues>
  watch: UseFormWatch<PostFormValues>
  setValue: UseFormSetValue<PostFormValues>
  categories?: Category[]
  /** When true, slug field is editable but auto-fill is disabled (edit mode) */
  disableAutoSlug?: boolean
  onFeatureMediaMeta?: (meta: UploadMeta) => void
  /** Ref forwarded to TextEditor — call editorRef.current.flushUploads() at submit time. */
  editorRef?: React.Ref<TextEditorHandle>
}

export function PostFormSections({
  control,
  watch,
  setValue,
  categories = [],
  disableAutoSlug = false,
  onFeatureMediaMeta,
  editorRef,
}: PostFormSectionsProps) {
  const title = watch('title')

  useEffect(() => {
    if (disableAutoSlug) return
    setValue('slug', slugify(title ?? ''), { shouldValidate: false })
  }, [title, setValue, disableAutoSlug])

  return (
    <>
      <Card className="border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Title <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Post title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Slug <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="post-slug" {...field} value={field.value ?? ''} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Auto-generated from title. You can edit manually.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
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
          <TextEditorField
            editorRef={editorRef}
            control={control}
            name="content"
            label="Content"
            placeholder="Post content…"
            minHeight="320px"
          />
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Status <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="trash">Trash</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="ai">AI</SelectItem>
                      <SelectItem value="wordpress">WordPress</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="lang"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. en, vi"
                      maxLength={10}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="published_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Published At</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ?? null}
                      onChange={field.onChange}
                      placeholder="Pick a date"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Internal note…"
                    maxLength={255}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Feature Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MediaPickerField
            control={control}
            name="feature_media"
            label="Feature Image"
            accept="image/*"
            placeholder="Pick a feature image…"
            onUploadMeta={onFeatureMediaMeta}
          />
        </CardContent>
      </Card>
    </>
  )
}
