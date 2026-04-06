export interface MediaFile {
  id: number
  user_id: number
  disk: string
  file_name: string
  original_name: string
  mime_type: string
  size: number
  path: string
  url: string
  alt_text: string
  created_at: string
  updated_at: string
}

export interface MediaPagination {
  current_page: number
  from: number
  to: number
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  total: number
}

export interface MediaListResponse {
  data: MediaFile[]
  pagination: MediaPagination
}

export type MediaOrderBy =
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'original_name'
  | 'size'
  | 'file_name'
export type MediaOrder = 'asc' | 'desc'

export interface MediaFilterParams {
  created_from: string | null
  created_to: string | null
  order: MediaOrder | null
  order_by: MediaOrderBy | null
  user_id: number | null
}
