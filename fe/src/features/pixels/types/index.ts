import { z } from 'zod'

export interface Pixel {
  id: number
  pixel_id: string
  name: string | null
  platform: PixelPlatform
  business_center_id: number
  business_center: PixelBusinessCenter | null
  status: PixelStatus
  created_at: string | null
}
export type PixelPlatform = 'facebook' | 'tiktok'
export type PixelStatus = 'active' | 'inactive'
export interface PixelBusinessCenter {
  id: number
  bc_id: string
  name: string
  ads_type: PixelPlatform
}
export type PixelBusinessCenterOption = PixelBusinessCenter
export interface PixelOption {
  id: number
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
  platform?: PixelPlatform
  business_center_id?: number
  status?: PixelStatus
  page?: number
  per_page?: number
}
export const pixelSchema = z.object({
  pixel_id: z.string().trim().min(1, 'Pixel ID is required').max(255),
  name: z.string().trim().min(1, 'Name is required').max(255),
  platform: z.enum(['facebook', 'tiktok']),
  business_center_id: z.number().int().positive('Business Center is required'),
  status: z.enum(['active', 'inactive']),
})
export type PixelFormValues = z.infer<typeof pixelSchema>
