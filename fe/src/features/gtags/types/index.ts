export type GtagOrderBy = 'id' | 'account_id' | 'account_name' | 'created_at'

export type GtagField = 'code' | 'article_view' | 'rsu_click' | 'search_view' | 'search_click'

export interface GtagData {
  code: string | null
  article_view: string | null
  rsu_click: string | null
  search_view: string | null
  search_click: string | null
}

export interface Gtag {
  id: number
  /** String from API, e.g. "123456789" */
  account_id: string
  account_name: string
  gtag: GtagData | null
}

export interface GtagPagination {
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

export interface GtagListResponse {
  data: Gtag[]
  pagination: GtagPagination
}

export interface GtagFilterParams {
  query?: string | null
  order?: 'asc' | 'desc' | null
  order_by?: GtagOrderBy | null
  page?: number
  per_page?: number
}

export interface GtagBulkUpdateRow {
  account_id: string
  code?: string | null
  article_view?: string | null
  rsu_click?: string | null
  search_view?: string | null
  search_click?: string | null
}

/** Map of rowId → per-field draft values (always strings; empty string represents null). */
export type GtagDraftMap = Record<number, Partial<Record<GtagField, string>>>
