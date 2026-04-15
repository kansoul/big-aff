export type AdsenseStyleReportOrderBy =
  | 'date'
  | 'style_name'
  | 'channel_name'
  | 'page_views'
  | 'clicks'
  | 'earnings'
  | 'cpc'

export type AdsenseStyleReportOrder = 'asc' | 'desc'

export interface AdsenseStyleReportRow {
  id: number
  date: string
  style_name: string
  channel_name: string
  page_views: number
  clicks: number
  earnings: number
  cpc: number
}

export interface AdsenseStyleReportPagination {
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

export interface AdsenseStyleReportListResponse {
  data: AdsenseStyleReportRow[]
  pagination: AdsenseStyleReportPagination
}

export interface AdsenseStyleReportFilterParams {
  query?: string | null
  order_by?: AdsenseStyleReportOrderBy | null
  order?: AdsenseStyleReportOrder | null
  page?: number
  per_page?: number
}
