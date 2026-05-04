import { axiosInstance } from '@/shared/api/axios'
import type {
  ChannelBulkCreatePayload,
  ChannelBulkCreateResponse,
  ChannelListResponse,
  ChannelOption,
} from '@/features/channels/types'
import type { ChannelOptionForAssign } from '@/features/channels/types/userChannelAssignments'

type UserChannelAssignmentsResponse = {
  data: Array<{
    user_id: number
    name: string
    email: string
    channels: ChannelOptionForAssign[]
  }>
  pagination: { total: number; per_page: number; current_page: number; last_page: number }
}

export const channelsApi = {
  async list(params?: {
    query?: string
    is_active?: boolean
    per_page?: number
    page?: number
    order_by?: string
    order?: 'asc' | 'desc'
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
    const res = await axiosInstance.get<{ data: ChannelOption[] }>('/options/channels')
    return res.data
  },

  async listUsersWithChannels(params?: {
    query?: string
    per_page?: number
    page?: number
  }): Promise<UserChannelAssignmentsResponse> {
    const res = await axiosInstance.get<UserChannelAssignmentsResponse>(
      '/users/channel-assignments',
      { params },
    )
    return res.data
  },

  async assignToUser(userId: number, channelCodes: string[]): Promise<{ skipped_codes: string[] }> {
    const res = await axiosInstance.post<{ skipped_codes: string[] }>(
      `/users/${userId}/assign-channels`,
      { channel_codes: channelCodes },
    )
    return res.data
  },
}
