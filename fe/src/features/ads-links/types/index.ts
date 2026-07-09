export interface AdsLinkSite {
  id: number
  name: string
  url: string
}

export interface AdsLinkPost {
  id: number
  title: string
  slug: string
}

export interface AdsLinkKeywordSet {
  id: number
  name: string
}

export interface AdsLink {
  id: number
  slug: string
  rac: string
  note: string | null
  is_hidden: boolean
  is_old: boolean
  channel_code: string | null
  channel_name: string | null
  style_code: string | null
  style_name: string | null
  fbid: string[] | null
  googleid: string[] | null
  tiktokid: string[] | null
  site: AdsLinkSite | null
  post: AdsLinkPost | null
  keyword_set: AdsLinkKeywordSet | null
  created_by: number | null
  updated_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface PostOption {
  id: number
  title: string
  slug: string
  keyword_sets: { id: number; name: string }[]
}

export interface ChannelOption {
  code: string
  name: string
}

export interface SiteOption {
  id: number
  name: string
}

export interface AdsLinkCreatePayload {
  site_id: number
  post_id: number
  channel_code: string
  rac: string
  keyword_set_id?: number | null
  note?: string | null
  fbid?: string | null
  googleid?: string | null
  tiktokid?: string | null
}

export interface AdsLinkUpdatePayload {
  rac?: string
  channel_code?: string | null
  keyword_set_id?: number | null
  fbid?: string | null
  googleid?: string | null
  tiktokid?: string | null
  note?: string | null
}

export interface UserOption {
  id: number
  name: string
}

export interface AdsLinkFilterParams {
  keyword?: string | null
  site_id?: number | null
  post_id?: number | null
  channel_code?: string | null
  created_by?: number | null
  pixel_id?: string | null
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
  platform: 'facebook' | 'google' | 'tiktok'
  id: string | string[]
  link: string
}

import { z } from 'zod'

export const adsLinkCreateSchema = z
  .object({
    site_id: z.number({ error: 'Site is required' }).min(1, 'Site is required'),
    post_id: z.number({ error: 'Post is required' }).min(1, 'Post is required'),
    channel_code: z.string().min(1, 'Channel is required'),
    rac: z.string().min(1, 'RAC is required'),
    keyword_set_id: z.number().nullable().optional(),
    note: z.string().nullable().optional(),
    fbid: z.string().nullable().optional(),
    googleid: z.string().nullable().optional(),
    tiktokid: z.string().nullable().optional(),
  })
  .refine(
    (v) =>
      (v.fbid?.trim() ?? '') !== '' ||
      (v.googleid?.trim() ?? '') !== '' ||
      (v.tiktokid?.trim() ?? '') !== '',
    {
      error:
        'At least one of Facebook Pixel ID, Google Account ID, or TikTok Advertiser ID is required',
      path: ['fbid'],
    },
  )

export const adsLinkUpdateSchema = z
  .object({
    rac: z.string().min(1, 'RAC is required'),
    channel_code: z.string().nullable().optional(),
    keyword_set_id: z.number().nullable().optional(),
    fbid: z.string().nullable().optional(),
    googleid: z.string().nullable().optional(),
    tiktokid: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
  })
  .refine(
    (v) =>
      (v.fbid?.trim() ?? '') !== '' ||
      (v.googleid?.trim() ?? '') !== '' ||
      (v.tiktokid?.trim() ?? '') !== '',
    {
      error:
        'At least one of Facebook Pixel ID, Google Account ID, or TikTok Advertiser ID is required',
      path: ['fbid'],
    },
  )

export type AdsLinkCreateFormValues = z.infer<typeof adsLinkCreateSchema>
export type AdsLinkUpdateFormValues = z.infer<typeof adsLinkUpdateSchema>
