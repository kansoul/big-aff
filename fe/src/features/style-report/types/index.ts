export type StyleReportOrderBy =
  | 'date'
  | 'style_name'
  | 'channel_name'
  | 'page_views'
  | 'clicks'
  | 'earnings'
  | 'cpc'

export type StyleReportOrder = 'asc' | 'desc'

export interface StyleReportRow {
  id: number
  date: string
  style_name: string
  channel_name: string
  page_views: number
  clicks: number
  earnings: number
  cpc: number
}

export interface StyleReportPagination {
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

export interface StyleReportListResponse {
  data: StyleReportRow[]
  pagination: StyleReportPagination
}

export interface StyleReportFilterParams {
  query?: string | null
  order_by?: StyleReportOrderBy | null
  order?: StyleReportOrder | null
  page?: number
  per_page?: number
}

export interface StyleReportRangeItem {
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  style_codes: string[]
}

export interface StyleReportRangeQueryPayload {
  ranges: StyleReportRangeItem[]
}

export interface StyleReportRangeRow {
  range_label: string
  style_code: string
  style_name: string
  revenue_start: number | null
  revenue_end: number | null
  real_revenue: number | null
  conversion_start: number | null
  conversion_end: number | null
  real_conversion: number | null
  real_rpc: number | null
  cpc: number | null
}

export interface StyleReportRangeQueryResponse {
  data: StyleReportRangeRow[]
}
