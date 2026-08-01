import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type { FollowFilterParams, FollowListResponse } from '@/features/follows/types'

export const followsApi = {
  list: (filters: FollowFilterParams) =>
    axiosInstance.get<FollowListResponse>('/follows', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(!isNil(filters.site_id) ? { site_id: filters.site_id } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  remove: (id: number) => axiosInstance.delete(`/follows/${id}`),
}
