export type AdsReportType = 'facebook' | 'google' | 'tiktok' | 'other'
export type AdsReportStatus = 'active' | 'paused' | 'archived'

export type AdsReportOrderBy =
  | 'date'
  | 'campaign_name'
  | 'status'
  | 'spend'
  | 'revenue'
  | 'impressions'
  | 'clicks'
  | 'reach'

export type AdsReportOrder = 'asc' | 'desc'

export interface AdsReportRow {
  id: number
  date: string
  main_team_id: number
  main_team_name: string
  type: AdsReportType
  account_id: number
  account_name: string
  campaign_id: number
  campaign_name: string
  status: AdsReportStatus
  spend: number
  revenue: number
  impressions: number
  clicks: number
  reach: number
}

export interface AdsReportSummary {
  campaign_total: number
  campaign_active: number
  campaign_paused: number
  campaign_archived: number
  total_spend: number
  total_revenue: number
  total_profit: number
  total_impressions: number
  total_clicks: number
  total_reach: number
}

export interface AdsReportPagination {
  current_page: number
  from: number | null
  to: number | null
  last_page: number
  last_page_url: string | null
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  total: number
}

export interface AdsReportFilterOption {
  id: number
  name: string
}

export interface AdsReportFilterOptions {
  main_teams: AdsReportFilterOption[]
  accounts: AdsReportFilterOption[]
  campaigns: AdsReportFilterOption[]
}

export interface AdsReportListResponse {
  data: AdsReportRow[]
  pagination: AdsReportPagination
  summary?: AdsReportSummary
  options?: AdsReportFilterOptions
}

export interface AdsReportFilterParams {
  date_from?: string | null
  date_to?: string | null
  main_team_id?: number | null
  type?: AdsReportType | null
  account_id?: number | null
  campaign_id?: number | null
  order_by?: AdsReportOrderBy | null
  order?: AdsReportOrder | null
  page?: number
  per_page?: number
}
