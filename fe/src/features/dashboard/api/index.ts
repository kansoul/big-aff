import { axiosInstance } from '@/shared/api/axios'
import type { ApiResponse, User } from '@/shared/types'

export const dashboardApi = {
  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout')
  },

  async getMe(): Promise<User> {
    const response = await axiosInstance.get<ApiResponse<User>>('/auth/me')
    return response.data.data
  },
}
