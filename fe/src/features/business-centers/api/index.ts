import { axiosInstance } from '@/shared/api/axios'
import type {
  BusinessCenter,
  BusinessCenterCreateFormValues,
  BusinessCenterFilterParams,
  BusinessCenterListResponse,
} from '@/features/business-centers/types'

export const businessCentersApi = {
  list: (page: number, perPage: number, filters: BusinessCenterFilterParams) =>
    axiosInstance.get<BusinessCenterListResponse>('/business-centers', {
      params: {
        page,
        per_page: perPage,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.order ? { order: filters.order } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
      },
    }),

  create: (data: BusinessCenterCreateFormValues) =>
    axiosInstance.post<{ data: BusinessCenter }>('/business-centers', {
      bc_id: data.bc_id,
      name: data.name,
      ads_type: data.ads_type,
      team_id: data.team_id ?? null,
    }),

  update: (id: number, data: Partial<BusinessCenterCreateFormValues>) =>
    axiosInstance.put<{ data: BusinessCenter }>(`/business-centers/${id}`, {
      bc_id: data.bc_id ?? undefined,
      name: data.name ?? undefined,
      ads_type: data.ads_type ?? undefined,
      team_id: data.team_id ?? null,
    }),

  get: (id: number) => axiosInstance.get<{ data: BusinessCenter }>(`/business-centers/${id}`),

  delete: (id: number) => axiosInstance.delete(`/business-centers/${id}`),
}
