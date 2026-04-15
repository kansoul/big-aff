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
