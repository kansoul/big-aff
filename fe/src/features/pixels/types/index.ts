import { z } from 'zod'

export interface PixelAccount {
  id: number
  account_id: string
  account_name: string | null
  ads_type: string
}
export interface Pixel {
  id: number
  account_id: number
  pixel_id: string
  name: string | null
  account: PixelAccount
  created_at: string | null
}
export interface PixelOption {
  id: number
  account_id: number
  pixel_id: string
  name: string | null
}
export interface PixelPagination {
  total: number
  current_page: number
  last_page: number
  per_page: number
}
export interface PixelListResponse {
  data: Pixel[]
  pagination: PixelPagination
}
export interface PixelFilters {
  query?: string
  account_id?: number
  page?: number
  per_page?: number
}
export const pixelSchema = z.object({
  account_id: z.number().min(1, 'Account is required'),
  pixel_id: z.string().trim().min(1, 'Pixel ID is required').max(255),
  name: z.string().trim().max(255).optional(),
})
export type PixelFormValues = z.infer<typeof pixelSchema>
