export type FollowOrderBy = 'id' | 'email' | 'site_id' | 'created_at'
export type FollowOrder = 'asc' | 'desc'

export interface Follow {
  id: number
  email: string
  style_code: string | null
  created_at: string | null
  updated_at: string | null
}

export interface FollowPagination {
  current_page: number
  from: number | null
  to: number | null
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string | null
  per_page: number
  prev_page_url: string | null
  total: number
}

export interface FollowListResponse {
  data: Follow[]
  pagination: FollowPagination
}

export interface FollowFilterParams {
  query?: string | null
  site_id?: number | null
  order_by?: FollowOrderBy | null
  order?: FollowOrder | null
  page?: number
  per_page?: number
}
