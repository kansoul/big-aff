export type GoogleConversionOrderBy = 'id' | 'account_id' | 'account_name' | 'created_at'

export type ConversionField = 'page_view' | 'redirect' | 'submit_form'

export interface GoogleConversionData {
  page_view: string | null
  redirect: string | null
  submit_form: string | null
}

export interface GoogleConversion {
  id: number
  /** String from API, e.g. "123456789" */
  account_id: string
  account_name: string
  conversion: GoogleConversionData | null
}

export interface GoogleConversionPagination {
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

export interface GoogleConversionListResponse {
  data: GoogleConversion[]
  pagination: GoogleConversionPagination
}

export interface GoogleConversionFilterParams {
  query?: string | null
  order?: 'asc' | 'desc' | null
  order_by?: GoogleConversionOrderBy | null
  page?: number
  per_page?: number
}

export interface GoogleConversionBulkUpdateRow {
  account_id: string
  page_view?: string | null
  redirect?: string | null
  submit_form?: string | null
}

/** Map of rowId → per-field draft values (always strings; empty string represents null). */
export type GoogleConversionDraftMap = Record<number, Partial<Record<ConversionField, string>>>
