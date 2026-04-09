import { axiosInstance } from '@/shared/api/axios'
import type {
  ChannelBulkCreatePayload,
  ChannelBulkCreateResponse,
  ChannelListResponse,
  ChannelOption,
} from '@/features/channels/types'

export const channelsApi = {
  async list(params?: {
    query?: string
    is_active?: boolean
    per_page?: number
    page?: number
  }): Promise<ChannelListResponse> {
    const res = await axiosInstance.get<ChannelListResponse>('/channels', { params })
    return res.data
  },

  async bulkCreate(payload: ChannelBulkCreatePayload): Promise<ChannelBulkCreateResponse> {
    const res = await axiosInstance.post<ChannelBulkCreateResponse>('/channels', payload)
    return res.data
  },

  async remove(id: number): Promise<void> {
    await axiosInstance.delete(`/channels/${id}`)
  },

  async options(): Promise<{ data: ChannelOption[] }> {
    const res = await axiosInstance.get<{ data: ChannelOption[] }>('/channels/options')
    return res.data
  },
}
