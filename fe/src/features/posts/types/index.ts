import { z } from 'zod'
import type { FileResource } from '@/features/categories/types'
import type { MediaFile } from '@/features/media/types'

export type PostStatus = 'draft' | 'published' | 'archived'
export type PostOrderBy = 'id' | 'title' | 'status' | 'published_at' | 'created_at' | 'updated_at'
export type PostOrder = 'asc' | 'desc'

export interface Post {
  id: number
  title: string
  slug: string
  lang: string | null
  description: string | null
  content: string | null
  feature_media_id: number | null
  feature_media: FileResource | null
  status: PostStatus
  is_hidden: boolean
  type: string | null
  category_id: number | null
  category: { id: number; name: string } | null
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
}

export const postFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
  lang: z.string().max(10).nullable().optional(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  feature_media: z.custom<MediaFile | null>().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived'], { error: 'Status is required' }),
  is_hidden: z.boolean().optional(),
  type: z.string().max(50).nullable().optional(),
  category_id: z.coerce.number().nullable().optional(),
  published_at: z.string().nullable().optional(),
})

export type PostFormValues = z.infer<typeof postFormSchema>
export const postCreateSchema = postFormSchema
export type PostCreateFormValues = PostFormValues
export const postUpdateSchema = postFormSchema
export type PostUpdateFormValues = PostFormValues
