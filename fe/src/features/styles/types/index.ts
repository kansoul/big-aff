import { z } from 'zod'

export interface Style {
  id: number
  code: string
  name: string
  created_by: number | null
  updated_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface StyleBulkCreatePayload {
  lines: string
}

export interface Pagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface StyleListResponse {
  data: Style[]
  pagination: Pagination
}

export interface StyleBulkCreateResponse {
  data: Style[]
  errors: string[]
}

export interface StyleOption {
  code: string
  name: string
}

export const styleBulkCreateSchema = z.object({
  lines: z.string().min(1, 'Please enter at least one line'),
})

export type StyleBulkCreateFormValues = z.infer<typeof styleBulkCreateSchema>
