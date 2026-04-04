export interface Media {
  id: number
  name: string
  url: string
  mime_type: string
  size: number
  created_at: string
}

export interface MediaListResponse {
  data: Media[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
