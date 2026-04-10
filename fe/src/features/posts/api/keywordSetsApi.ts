import { axiosInstance } from '@/shared/api/axios'
import type { KeywordSet } from '@/features/posts/types'

export interface KeywordSetListParams {
  keyword?: string | null
  order?: 'asc' | 'desc' | null
  order_by?: 'id' | 'name' | 'created_by' | 'created_at' | null
  page?: number
  per_page?: number
}

export interface KeywordSetPagination {
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

export interface KeywordSetListResponse {
  data: KeywordSet[]
  pagination: KeywordSetPagination
}

export const keywordSetsApi = {
  list: (params: KeywordSetListParams) =>
    axiosInstance.get<KeywordSetListResponse>('/keyword-sets', {
      params: {
        ...(params.keyword ? { keyword: params.keyword } : {}),
        ...(params.order ? { order: params.order } : {}),
        ...(params.order_by ? { order_by: params.order_by } : {}),
        ...(params.page != null ? { page: params.page } : {}),
        ...(params.per_page != null ? { per_page: params.per_page } : {}),
      },
    }),

  create: (body: { name: string; keywords?: string[] | null }) =>
    axiosInstance.post<{ data: KeywordSet }>('/keyword-sets', body),

  update: (id: number, body: { name?: string; keywords?: string[] | null }) =>
    axiosInstance.put<{ data: KeywordSet }>(`/keyword-sets/${id}`, body),

  remove: (id: number) => axiosInstance.delete(`/keyword-sets/${id}`),
}
