import { axiosInstance } from '@/shared/api/axios'
import type { ChannelOption, StyleOption } from '@/shared/types/options'

export const optionsApi = {
  async channels(): Promise<ChannelOption[]> {
    const response = await axiosInstance.get<{ data: ChannelOption[] }>('/options/channels')
    return response.data.data
  },

  async styles(): Promise<StyleOption[]> {
    const response = await axiosInstance.get<{ data: StyleOption[] }>('/options/styles')
    return response.data.data
  },
}
