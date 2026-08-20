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
  | 'revenue'
  | 'created_at'
  | 'revenue_received_at'

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
  revenue: number
  revenue_received_at: string | null
  created_at: string
  updated_at: string
}

export interface RevenueReportSummary {
  revenue: number
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
