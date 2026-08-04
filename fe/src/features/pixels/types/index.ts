import { z } from 'zod'

export interface Pixel {
  id: number
  pixel_id: string
  name: string | null
  created_at: string | null
}
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
  page?: number
  per_page?: number
}
export const pixelSchema = z.object({
  pixel_id: z.string().trim().min(1, 'Pixel ID is required').max(255),
  name: z.string().trim().max(255).optional(),
})
export type PixelFormValues = z.infer<typeof pixelSchema>
