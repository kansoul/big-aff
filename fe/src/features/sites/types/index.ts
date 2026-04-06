import { z } from 'zod'

export type SiteStatus = 'active' | 'maintenance' | 'suspended'
export type SiteOrderBy = 'id' | 'name' | 'url' | 'status' | 'created_at' | 'updated_at'
export type SiteOrder = 'asc' | 'desc'

export const siteCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  url: z
    .string()
    .min(1, 'URL is required')
    .max(255)
    .refine(
      (v) => {
        try {
          new URL(v)
          return true
        } catch {
          return false
        }
      },
      { message: 'Must be a valid URL' },
    ),
  description: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'suspended']).optional(),
  logo: z.custom<File | null>().nullable().optional(),
  favicon: z.custom<File | null>().nullable().optional(),
  settings: z
    .object({
      gtm: z.string().max(255).optional(),
      fb_pixel: z.string().max(255).optional(),
      theme: z.string().max(255).optional(),
    })
    .optional(),
})

export type SiteCreateFormValues = z.infer<typeof siteCreateSchema>

export interface Site {
  id: number
  name: string
  url: string
  status: SiteStatus
  created_at: string
  updated_at: string
}

export interface SiteFile {
  id: number
  url: string
  file_name: string
  original_name: string
  mime_type: string
  size: number
  path: string
  alt_text?: string | null
}

export interface SiteDetail extends Site {
  description?: string | null
  logo?: SiteFile | null
  favicon?: SiteFile | null
  settings?: {
    gtm?: string | null
    fb_pixel?: string | null
    theme?: string | null
  } | null
}

export interface SitePagination {
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

export interface SiteListResponse {
  data: Site[]
  pagination: SitePagination
}

export interface SiteFilterParams {
  keyword: string | null
  status: SiteStatus | null
  order: SiteOrder | null
  order_by: SiteOrderBy | null
}
