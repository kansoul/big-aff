import { z } from 'zod'

export type SortDirection = 'asc' | 'desc'

export interface PaginationMeta {
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

export interface AdxGame {
  id: number
  name: string
  slug: string
  thumbnail: string | null
  description: string | null
  game_url: string | null
  status: string
  sort_order: number
  created_by: number | null
  updated_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface AdxAssignedGameSummary {
  id: number
  name: string
  slug: string
  game_url: string | null
  status: string
}

export interface AdxUserWithGames {
  id: number
  name: string
  email: string
  games: AdxAssignedGameSummary[]
}

export interface AdxLink {
  id: number
  source_id: number
  adx_game_id: number
  game?: Pick<AdxGame, 'id' | 'name' | 'slug'> | null
  name: string
  landing_url: string
  status: string
  created_by: number | null
  updated_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface AdxAccount {
  id: number
  business_center_id: number | null
  team_id: number | null
  main_team_id: number | null
  source: string
  account_id: string
  account_name: string | null
  status: string
  is_special: boolean
  sync_to_mcc: boolean
  user_id: number | null
  created_by: number | null
  updated_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface AdxAssignedAccountSummary {
  id: number
  source: string
  account_id: string
  account_name: string | null
}

export interface AdxUserWithAccounts {
  id: number
  name: string
  email: string
  accounts: AdxAssignedAccountSummary[]
}

export interface AdxCampaign {
  id: number
  adx_account_id: string | null
  source: string
  account?: Pick<AdxAccount, 'id' | 'account_id' | 'account_name'> | null
  campaign_id: string
  campaign_name: string | null
  daily_budget: string | number
  lifetime_budget: string | number
  gam_custom_key: string
  gam_custom_key_id: number | null
  gam_custom_value: string | null
  gam_custom_value_id: number | null
  gam_targeting_ready: boolean
  status: string
  start_time: string | null
  stop_time: string | null
  created_time: string | null
  updated_time: string | null
  first_seen_at: string | null
  last_seen_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AdxRealtimeReportRef {
  id: number
  landing_views: number
  get_game_link_clicks: number
  detail_views: number
  get_bonus_clicks: number
}

export interface AdxCampaignReport {
  id: number
  date: string
  source: string
  adx_account_id: number | null
  adx_campaign_id: number | null
  adx_link_data_id: number | null
  adx_link_id: number | null
  adx_game_id: number | null
  adx_realtime_report_id: number | null
  account_id: string | null
  account_name: string | null
  campaign_id: string | null
  campaign_name: string | null
  campaign_status: string | null
  spend: string | number
  revenue: string | number
  profit: string | number
  roi: string | number
  roas: string | number
  ads_clicks: number
  ads_impressions: number
  adx_impressions: number
  adx_clicks: number
  cpc: string | number
  epc: string | number
  rpm: string | number
  currency: string
  realtime_report: AdxRealtimeReportRef | null
  created_at: string | null
  updated_at: string | null
}

export interface AdxAccountConversion {
  id: number
  source: string
  account_id: string
  conversion_type: AdxConversionType
  conversion_action_id: string
  name: string | null
  status: string
  created_at: string | null
  updated_at: string | null
}

export type AdxConversionType =
  | 'landing_view'
  | 'get_game_link_click'
  | 'detail_view'
  | 'get_bonus_click'

export type ListResponse<T> = {
  data: T[]
  pagination: PaginationMeta
}

export type ImportResponse = {
  data: {
    processed: number
    skipped: number
  }
}

export type AdxAccountBulkCreatePayload = {
  source: string
  status: string
  is_special: boolean
  sync_to_mcc: boolean
  lines: string
}

export type AdxAccountBulkCreateResponse = {
  data: {
    created: AdxAccount[]
    errors: string[]
  }
}

export type AdxGameOrderBy = 'id' | 'name' | 'slug' | 'status' | 'sort_order' | 'created_at'
export type AdxLinkOrderBy = 'id' | 'name' | 'status' | 'created_at'
export type AdxAccountOrderBy =
  | 'id'
  | 'source'
  | 'account_id'
  | 'account_name'
  | 'status'
  | 'created_at'
export type AdxCampaignOrderBy =
  | 'id'
  | 'source'
  | 'campaign_id'
  | 'status'
  | 'last_seen_at'
  | 'created_at'
export type AdxAccountConversionOrderBy =
  | 'id'
  | 'source'
  | 'account_id'
  | 'conversion_type'
  | 'status'
  | 'created_at'
export type AdxCampaignReportOrderBy =
  | 'id'
  | 'date'
  | 'source'
  | 'account_id'
  | 'campaign_id'
  | 'spend'
  | 'revenue'
  | 'profit'
  | 'roi'
  | 'roas'
  | 'created_at'

export interface BaseListParams<TOrderBy extends string> {
  page?: number
  per_page?: number
  order_by?: TOrderBy | null
  order?: SortDirection | null
}

export interface AdxGameFilterParams extends BaseListParams<AdxGameOrderBy> {
  keyword?: string | null
  status?: string | null
}

export interface AdxLinkFilterParams extends BaseListParams<AdxLinkOrderBy> {
  keyword?: string | null
  adx_game_id?: number | null
  status?: string | null
}

export interface AdxAccountFilterParams extends BaseListParams<AdxAccountOrderBy> {
  query?: string | null
  source?: string | null
  status?: string | null
}

export interface AdxUserAccountAssignmentFilterParams extends BaseListParams<
  'id' | 'name' | 'email' | 'created_at'
> {
  query?: string | null
}

export interface AdxUserGameAssignmentFilterParams extends BaseListParams<
  'id' | 'name' | 'email' | 'created_at'
> {
  query?: string | null
}

export interface AdxCampaignFilterParams extends BaseListParams<AdxCampaignOrderBy> {
  keyword?: string | null
  source?: string | null
  adx_account_id?: string | null
  account_id?: string | null
  campaign_id?: string | null
  status?: string | null
}

export interface AdxAccountConversionFilterParams extends BaseListParams<AdxAccountConversionOrderBy> {
  source?: string | null
  account_id?: string | null
  conversion_type?: string | null
  status?: string | null
}

export interface AdxCampaignReportFilterParams extends BaseListParams<AdxCampaignReportOrderBy> {
  date_from?: string | null
  date_to?: string | null
  source?: string | null
  account_id?: string | null
  campaign_id?: string | null
}

export const adxGameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().max(255).optional().nullable(),
  thumbnail: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  game_url: z.string().max(255).optional().nullable(),
  status: z.string().min(1, 'Status is required').max(50).default('active'),
  sort_order: z.coerce.number().int().min(0).default(0),
})

export const adxLinkSchema = z.object({
  adx_game_id: z.coerce.number().int().min(1, 'Game is required'),
  name: z.string().min(1, 'Name is required').max(255),
  landing_url: z.string().min(1, 'Landing URL is required'),
  status: z.string().min(1, 'Status is required').max(50).default('active'),
})

export const adxAccountSchema = z.object({
  source: z.string().min(1, 'Source is required').max(50),
  account_id: z.string().min(1, 'Account ID is required').max(191),
  account_name: z.string().max(255).optional().nullable(),
  status: z.string().min(1, 'Status is required').max(50).default('ACTIVE'),
  is_special: z.boolean().default(false),
  sync_to_mcc: z.boolean().default(false),
})

export const adxAccountConversionSchema = z.object({
  source: z.string().min(1, 'Source is required').max(50),
  account_id: z.string().min(1, 'Account ID is required').max(191),
  conversion_type: z.enum([
    'landing_view',
    'get_game_link_click',
    'detail_view',
    'get_bonus_click',
  ]),
  conversion_action_id: z.string().min(1, 'Conversion action ID is required').max(191),
  name: z.string().max(255).optional().nullable(),
  status: z.string().min(1, 'Status is required').max(50).default('active'),
})

export type AdxGameFormValues = z.infer<typeof adxGameSchema>
export type AdxLinkFormValues = z.infer<typeof adxLinkSchema>
export type AdxAccountFormValues = z.infer<typeof adxAccountSchema>
export type AdxAccountConversionFormValues = z.infer<typeof adxAccountConversionSchema>
