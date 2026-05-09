import { axiosInstance } from '@/shared/api/axios'
import type { ApiResponse, User } from '@/shared/types'
import type {
  InsightStatsData,
  RevenueTableParams,
  RevenueTableResponse,
} from '@/features/dashboard/types'

export const dashboardApi = {
  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout')
  },

  async uploadAvatar(file: File): Promise<User> {
    const form = new FormData()
    form.append('avatar', file)
    const response = await axiosInstance.post<ApiResponse<User>>('/auth/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.data
  },

  async getMe(): Promise<User> {
    const response = await axiosInstance.get<ApiResponse<User>>('/auth/me')
    const u = response.data.data
    return {
      ...u,
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
      is_main_system: Boolean(u.is_main_system),
    }
  },

  insightStats: () => axiosInstance.get<{ data: InsightStatsData }>('/dashboard/insight-stats'),

  revenueTable: (params?: RevenueTableParams) =>
    axiosInstance.get<RevenueTableResponse>('/dashboard/revenue-table', {
      params: {
        ...(params?.top_limit != null ? { top_limit: params.top_limit } : {}),
      },
    }),
}
