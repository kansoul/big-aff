import { z } from 'zod'
import type { FileResource } from '@/features/categories/types'
import type { MediaFile } from '@/features/media/types'

export interface KeywordSet {
  id: number
  name: string
  keywords: string[] | null
  created_at: string
}

export type PostStatus = 'draft' | 'published' | 'trash'
export type PostType = 'normal' | 'ai' | 'wordpress'
export type PostOrderBy = 'id' | 'title' | 'status' | 'published_at' | 'created_at' | 'updated_at'
export type PostOrder = 'asc' | 'desc'

export interface Post {
  id: number
  title: string
  slug: string
  lang: string | null
  note: string | null
  description: string | null
  content: string | null
  feature_media_id: number | null
  feature_media: FileResource | null
  status: PostStatus
  is_hidden: boolean
  type: PostType | null
  category_id: number | null
  category: { id: number; name: string } | null
  keyword_sets: KeywordSet[] | null
  created_by: number | null
  updated_by: number | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface PostPagination {
  current_page: number
  from: number | null
  to: number | null
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  total: number
}

export interface PostListResponse {
  data: Post[]
  pagination: PostPagination
}

export interface PostFilterParams {
  query: string | null
  status: PostStatus | null
  category_id: number | null
  lang: string | null
  type: string | null
  order_by: PostOrderBy | null
  order: PostOrder | null
  created_at_from?: string | null
  created_at_to?: string | null
  created_by?: number | string | null
  deleted_at?: 'with' | 'only' | 'without' | null
  is_hidden?: number | string | boolean | null
}

export const postFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
  lang: z.string().max(10).nullable().optional(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  feature_media: z.custom<MediaFile | null>().nullable().optional(),
  feature_media_id: z.coerce.number().nullable().optional(),
  note: z.string().max(255).nullable().optional(),
  status: z.enum(['draft', 'published', 'trash']).nullable().optional(),
  is_hidden: z.boolean().nullable().optional(),
  type: z.enum(['normal', 'ai', 'wordpress']).nullable().default('normal'),
  category_id: z.coerce.number().nullable().optional(),
  published_at: z.string().nullable().optional(),
  keyword_set_ids: z.array(z.number()).nullable().optional(),
})

export type PostFormValues = z.infer<typeof postFormSchema>
export const postCreateSchema = postFormSchema
export type PostCreateFormValues = PostFormValues
export const postUpdateSchema = postFormSchema
export type PostUpdateFormValues = PostFormValues
