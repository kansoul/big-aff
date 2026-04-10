import { z } from 'zod'

export type CategoryOrderBy = 'id' | 'name' | 'created_at' | 'updated_at'
export type CategoryOrder = 'asc' | 'desc'

export interface CategoryParent {
  id: number
  name: string
}

export interface FileResource {
  id: number
  user_id: number
  disk: string
  file_name: string
  original_name: string
  mime_type: string
  size: number
  path: string
  url: string
  alt_text: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  parent_id?: string | null
  parent: CategoryParent | null
  name: string
  description: string | null
  feature_media_id: number | null
  feature_media: FileResource | null
  created_by: number | null
  updated_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface CategoryPagination {
  current_page: number
  from: number | null
  to: number | null
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string | null
  per_page: number
  prev_page_url: string | null
  total: number
}

export interface CategoryListResponse {
  data: Category[]
  pagination: CategoryPagination
}

export interface CategoryFilterParams {
  query?: string | null
  parent_id?: number | string | null
  order_by?: CategoryOrderBy | null
  order?: CategoryOrder | null
  page?: number
  per_page?: number
}

export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullable().optional(),
  feature_image: z.any().nullable().optional(),
  parent_id: z.any().nullable().optional(),
})

export type CategoryCreateFormValues = z.infer<typeof categoryCreateSchema>

export const categoryUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullable().optional(),
  feature_image: z.any().nullable().optional(),
  parent_id: z.any().nullable().optional(),
})

export type CategoryUpdateFormValues = z.infer<typeof categoryUpdateSchema>

/** Params sent to the API after resolving media (upload-on-submit) */
export type CategoryCreateApiParams = {
  name: string
  description?: string | null
  parent_id?: number | null
  feature_media_id?: number | null
}

export type CategoryUpdateApiParams = {
  name?: string
  description?: string | null
  parent_id?: number | null
  feature_media_id?: number | null
}
