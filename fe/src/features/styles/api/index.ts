import { axiosInstance } from '@/shared/api/axios'
import type {
  StyleBulkCreatePayload,
  StyleBulkCreateResponse,
  StyleListResponse,
  StyleOption,
} from '@/features/styles/types'

export const stylesApi = {
  async list(params?: {
    query?: string
    per_page?: number
    page?: number
    order_by?: string
    order?: string
  }): Promise<StyleListResponse> {
    const res = await axiosInstance.get<StyleListResponse>('/styles', { params })
    return res.data
  },

  async bulkCreate(payload: StyleBulkCreatePayload): Promise<StyleBulkCreateResponse> {
    const res = await axiosInstance.post<StyleBulkCreateResponse>('/styles', payload)
    return res.data
  },

  async remove(id: number): Promise<void> {
    await axiosInstance.delete(`/styles/${id}`)
  },

  async options(): Promise<{ data: StyleOption[] }> {
    const res = await axiosInstance.get<{ data: StyleOption[] }>('/options/styles')
    return res.data
  },
}
