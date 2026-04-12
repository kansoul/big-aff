import { z } from 'zod'

export type AdClientOrderBy =
  | 'id'
  | 'ad_client_id'
  | 'product_code'
  | 'product_name'
  | 'created_at'
  | 'updated_at'
export type AdClientOrder = 'asc' | 'desc'

export interface AdClient {
  id: number
  ad_client_id: string
  product_code: string | null
  product_name: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AdClientPagination {
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

export interface AdClientListResponse {
  data: AdClient[]
  pagination: AdClientPagination
}

export interface AdClientFilterParams {
  query?: string | null
  order_by?: AdClientOrderBy | null
  order?: AdClientOrder | null
  page?: number
  per_page?: number
}

export const adClientSchema = z.object({
  ad_client_id: z.string().min(1, 'Ad Client ID is required').max(255),
  product_code: z.string().max(255).nullable().optional(),
  product_name: z.string().max(255).nullable().optional(),
})

export type AdClientFormValues = z.infer<typeof adClientSchema>

export type AdClientPayload = {
  ad_client_id: string
  product_code?: string | null
  product_name?: string | null
}
