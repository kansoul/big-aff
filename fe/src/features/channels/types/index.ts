import { z } from 'zod'

export interface Channel {
  id: number
  code: string
  name: string
  is_active: boolean
  created_by: number | null
  updated_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface ChannelBulkCreatePayload {
  lines: string
}

export interface Pagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface ChannelListResponse {
  data: Channel[]
  pagination: Pagination
}

export interface ChannelBulkCreateResponse {
  data: Channel[]
  errors: string[]
}

export interface ChannelOption {
  code: string
  name: string
}

export interface ChannelFilterParams {
  query?: string | null
  page?: number
  per_page?: number
}

export const channelBulkCreateSchema = z.object({
  lines: z.string().min(1, 'Please enter at least one line'),
})

export type ChannelBulkCreateFormValues = z.infer<typeof channelBulkCreateSchema>
