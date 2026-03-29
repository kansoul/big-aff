import { axiosInstance } from '@/shared/api/axios'
import type { ApiResponse, User } from '@/shared/types'

export const dashboardApi = {
  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout')
  },

  async getMe(): Promise<User> {
    const response = await axiosInstance.get<ApiResponse<User>>('/auth/me')
    const u = response.data.data
    return {
      ...u,
      permission_mask: u.permission_mask ?? 0,
      permissions: u.permissions ?? [],
    }
  },
}
