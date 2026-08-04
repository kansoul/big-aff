export interface RevenueReportFilterParams {
  campaign_ids?: string[]
  date_from?: string | null
  date_to?: string | null
  order_by?: RevenueReportOrderBy | null
  order?: RevenueReportOrder | null
  page?: number
  per_page?: number
}

export type RevenueReportOrderBy =
  | 'id'
  | 'session_id'
  | 'campaign_id'
  | 'adset_id'
  | 'ad_id'
  | 'click_id'
  | 'estimate_earning'
  | 'page_views'
  | 'clicks'
  | 'ad_requests'
  | 'impressions'
  | 'ad_requests_rpm'
  | 'impressions_rpm'
  | 'cost_per_click'
  | 'funnel_requests'
  | 'funnel_impressions'
  | 'funnel_clicks'
  | 'funnel_rpm'
  | 'created_at'

export type RevenueReportOrder = 'asc' | 'desc'

export interface RevenueReportListResponse {
  data: RevenueReportRow[]
  summary: RevenueReportSummary
  pagination: RevenueReportPagination
}

export interface RevenueReportRow {
  id: number
  session_id: string
  campaign_id: string
  adset_id: string | null
  ad_id: string | null
  click_id: number
  estimate_earning: number
  page_views: number | null
  clicks: number | null
  ad_requests: number | null
  impressions: number | null
  ad_requests_rpm: number | null
  impressions_rpm: number | null
  cost_per_click: number | null
  funnel_requests: number | null
  funnel_impressions: number | null
  funnel_clicks: number | null
  funnel_rpm: number | null
  created_at: string
  updated_at: string
}

export interface RevenueReportSummary {
  estimate_earning: number
  page_views: number
  clicks: number
  ad_requests: number
  impressions: number
  ad_requests_rpm: number
  impressions_rpm: number
  cost_per_click: number
  funnel_requests: number
  funnel_impressions: number
  funnel_clicks: number
  funnel_rpm: number
}

export interface RevenueReportPagination {
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
