import { useEffect } from 'react'
import type { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form'

import type { Category } from '@/features/categories/types'
import type { KeywordSet, PostFormValues } from '@/features/posts/types'
import { MediaPickerField } from '@/components/common/MediaPickerDialog'
import { KeywordSetPickerField } from './KeywordSetPickerField'
import { TextEditorField } from '@/components/common/TextEditor'
import { LANGUAGE_OPTIONS } from '@/constants/languages'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/common/SearchableSelect'
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
  defaultKeywordSets?: KeywordSet[]
  /** When true, slug field is editable but auto-fill is disabled (edit mode) */
  disableAutoSlug?: boolean
  canCreateKeywordSet?: boolean
  canUpdateKeywordSet?: boolean
  canDeleteKeywordSet?: boolean
}

export function PostFormSections({
  control,
  watch,
  setValue,
  categories = [],
  defaultKeywordSets,
  disableAutoSlug = false,
  canCreateKeywordSet = false,
  canUpdateKeywordSet = false,
  canDeleteKeywordSet = false,
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Status <span className="text-destructive">*</span>
                  </FormLabel>
                  <SearchableSelect
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    options={[
                      { label: 'Draft', value: 'draft' },
                      { label: 'Published', value: 'published' },
                      { label: 'Trash', value: 'trash' },
                    ]}
                    placeholder="Select status"
                  />
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
                  <SearchableSelect
                    value={field.value ?? '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                    options={[
                      { label: 'Normal', value: 'normal' },
                      { label: 'AI', value: 'ai' },
                      { label: 'WordPress', value: 'wordpress' },
                    ]}
                    placeholder="Select type"
                  />
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
                  <SearchableSelect
                    value={field.value ?? undefined}
                    onValueChange={(v) => field.onChange(v)}
                    options={LANGUAGE_OPTIONS}
                    placeholder="Select language"
                    searchPlaceholder="Search language…"
                  />
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
                  <SearchableSelect
                    value={field.value ? String(field.value) : '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : Number(v))}
                    options={[
                      ...categories.map((cat) => ({ label: cat.name, value: String(cat.id) })),
                    ]}
                    placeholder="Select category"
                  />
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
            {/* add keyword here field */}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <FormField
              control={control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      maxLength={255}
                      rows={3}
                      className="resize-none"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <KeywordSetPickerField
            control={control}
            name="keyword_set_ids"
            defaultItems={defaultKeywordSets}
            canCreate={canCreateKeywordSet}
            canUpdate={canUpdateKeywordSet}
            canDelete={canDeleteKeywordSet}
          />
          <MediaPickerField
            control={control}
            name="feature_media"
            label="Feature Image"
            accept="image/*"
            directory="media/posts"
            placeholder="Pick a feature image…"
          />
          <TextEditorField
            control={control}
            name="content"
            label="Content"
            placeholder="Post content…"
            minHeight="320px"
            directory="media/posts"
          />
        </CardContent>
      </Card>
    </>
  )
}
