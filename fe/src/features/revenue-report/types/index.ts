export interface RevenueReportFilterParams {
  style_codes?: string[]
  date_from?: string | null
  date_to?: string | null
  order_by?: RevenueReportOrderBy | null
  order?: RevenueReportOrder | null
  page?: number
  per_page?: number
}
export type RevenueReportOrderBy =
  | 'id'
  | 'date'
  | 'style_code'
  | 'page_views'
  | 'clicks'
  | 'estimated_earnings'
  | 'ad_requests'
  | 'impressions'
  | 'cost_per_click'
  | 'funnel_requests'
  | 'funnel_impressions'
  | 'funnel_clicks'
  | 'funnel_rpm'
  | 'created_at'

export type RevenueReportOrder = 'asc' | 'desc'
export interface RevenueReportListResponse {
  data: RevenueReportRow[]
  summary: Partial<RevenueReportRow>
  pagination: RevenueReportPagination
}

export interface RevenueReportRow {
  id: number
  ad_client_id: string
  style_code: string
  style_name: string
  date: string
  page_views: number
  clicks: number
  estimated_earnings: number
  ad_requests: number
  impressions: number
  ad_requests_rpm: number
  impressions_rpm: number
  cost_per_click: number
  funnel_requests: number | null
  funnel_impressions: number | null
  funnel_clicks: number | null
  funnel_rpm: number | null
  created_at: string
  updated_at: string
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
