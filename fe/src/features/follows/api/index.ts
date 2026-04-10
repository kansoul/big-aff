import { axiosInstance } from '@/shared/api/axios'
import type { FollowFilterParams, FollowListResponse } from '@/features/follows/types'

export const followsApi = {
  list: (filters: FollowFilterParams) =>
    axiosInstance.get<FollowListResponse>('/follows', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.site_id != null ? { site_id: filters.site_id } : {}),
        ...(filters.post_id != null ? { post_id: filters.post_id } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  remove: (id: number) => axiosInstance.delete(`/follows/${id}`),
}
