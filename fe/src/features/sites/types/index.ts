import { z } from 'zod'

import type { MediaFile } from '@/features/media/types'

export type { MediaFile }

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
  status: z.enum(['active', 'maintenance', 'suspended']).default('active'),
  logo: z.custom<MediaFile>().nullable().optional(),
  favicon: z.custom<MediaFile>().nullable().optional(),
  settings: z.object({
    gtm: z.string().max(255).optional(),
    theme: z.string().max(255).optional(),
  }),
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

export interface SiteDetail extends Site {
  description?: string | null
  logo?: MediaFile | null
  favicon?: MediaFile | null
  settings?: {
    gtm?: string | null
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

/** Params sent to the API after resolving media (upload-on-submit) */
export type SiteCreateApiParams = {
  name: string
  url: string
  description?: string | null
  status?: SiteStatus | null
  logo_id?: number | null
  favicon_id?: number | null
  settings: {
    gtm?: string | null
    theme?: string | null
  }
}

export interface SiteFilterParams {
  keyword: string | null
  status: SiteStatus | null
  order: SiteOrder | null
  order_by: SiteOrderBy | null
}
