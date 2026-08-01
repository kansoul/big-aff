export interface AdsLinkSite {
  id: number
  name: string
  url: string
}

export interface AdsLink {
  id: number
  slug: string
  rac: string
  note: string | null
  is_hidden: boolean
  is_old: boolean
  googleid: string[] | null
  tiktokid: string[] | null
  tiktok_pixel_id: string[] | null
  site: AdsLinkSite | null
  created_by: number | null
  updated_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface SiteOption {
  id: number
  name: string
}

export interface AdsLinkCreatePayload {
  site_id: number
  rac: string
  note?: string | null
  googleid?: string | null
  tiktokid?: string | null
  tiktok_pixel_id?: string | null
}

export interface AdsLinkUpdatePayload {
  rac?: string
  googleid?: string | null
  tiktokid?: string | null
  tiktok_pixel_id?: string | null
  note?: string | null
}

export interface UserOption {
  id: number
  name: string
}

export interface AdsLinkFilterParams {
  keyword?: string | null
  site_id?: number | null
  created_by?: number | null
  googleid?: string | null
  tiktokid?: string | null
  note?: string | null
  url?: string | null
  date_range?: { from: string | null; to: string | null } | null
  is_hidden?: boolean | 1 | 0 | null
  page?: number
  per_page?: number
  order_by?: string | null
  order?: 'asc' | 'desc' | null
}

export interface Pagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export type CopyDialogState = {
  open: boolean
  platform: 'google' | 'tiktok'
  id: string | string[]
  link: string
}

import { z } from 'zod'

export const adsLinkCreateSchema = z
  .object({
    site_id: z.number({ error: 'Site is required' }).min(1, 'Site is required'),
    rac: z.string().min(1, 'RAC is required'),
    note: z.string().nullable().optional(),
    googleid: z.string().nullable().optional(),
    tiktokid: z.string().nullable().optional(),
    tiktok_pixel_id: z.string().nullable().optional(),
  })
  .refine((v) => (v.googleid?.trim() ?? '') !== '' || (v.tiktokid?.trim() ?? '') !== '', {
    error: 'At least one of Google Account ID or TikTok Advertiser ID is required',
    path: ['googleid'],
  })
  .refine((v) => (v.tiktokid?.trim() ?? '') === '' || (v.tiktok_pixel_id?.trim() ?? '') !== '', {
    error: 'TikTok Pixel ID is required when TikTok Advertiser ID is provided',
    path: ['tiktok_pixel_id'],
  })

export const adsLinkUpdateSchema = z
  .object({
    rac: z.string().min(1, 'RAC is required'),
    googleid: z.string().nullable().optional(),
    tiktokid: z.string().nullable().optional(),
    tiktok_pixel_id: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
  })
  .refine((v) => (v.googleid?.trim() ?? '') !== '' || (v.tiktokid?.trim() ?? '') !== '', {
    error: 'At least one of Google Account ID or TikTok Advertiser ID is required',
    path: ['googleid'],
  })
  .refine((v) => (v.tiktokid?.trim() ?? '') === '' || (v.tiktok_pixel_id?.trim() ?? '') !== '', {
    error: 'TikTok Pixel ID is required when TikTok Advertiser ID is provided',
    path: ['tiktok_pixel_id'],
  })

export type AdsLinkCreateFormValues = z.infer<typeof adsLinkCreateSchema>
export type AdsLinkUpdateFormValues = z.infer<typeof adsLinkUpdateSchema>
