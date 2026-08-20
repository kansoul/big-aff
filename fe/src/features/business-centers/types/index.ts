import { z } from 'zod'

export type AdsType = 'facebook' | 'google' | 'tiktok' | 'unknown'
export type BusinessCenterOrderBy = 'id' | 'name'
export type BusinessCenterOrder = 'asc' | 'desc'

export const businessCenterCreateSchema = z.object({
  bc_id: z.string().min(1, 'BC ID is required').max(255),
  name: z.string().min(1, 'Name is required').max(255),
  ads_type: z.enum(['facebook', 'google', 'tiktok', 'unknown'], {
    error: 'Ads type is required',
  }),
  team_id: z.number().int().nullable().optional(),
})

export type BusinessCenterCreateFormValues = z.infer<typeof businessCenterCreateSchema>

export interface BusinessCenter {
  id: number
  bc_id: string
  name: string
  ads_type: AdsType
  team_id: number | null
  team: null
  created_by: number
  updated_by: number | null
  created_at: string
  updated_at: string
}

export interface BusinessCenterPagination {
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

export interface BusinessCenterListResponse {
  data: BusinessCenter[]
  pagination: BusinessCenterPagination
}

export interface BusinessCenterFilterParams {
  query: string | null
  order: BusinessCenterOrder | null
  order_by: BusinessCenterOrderBy | null
}
