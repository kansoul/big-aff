import { axiosInstance } from '@/shared/api/axios'
import type {
  AdClient,
  AdClientFilterParams,
  AdClientListResponse,
  AdClientPayload,
} from '@/features/ad-clients/types'

export const adClientsApi = {
  list: (filters: AdClientFilterParams) =>
    axiosInstance.get<AdClientListResponse>('/ad-clients', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  create: (payload: AdClientPayload) =>
    axiosInstance.post<{ data: AdClient }>('/ad-clients', {
      ad_client_id: payload.ad_client_id,
      product_code: payload.product_code ?? null,
      product_name: payload.product_name ?? null,
    }),

  update: (id: number, payload: AdClientPayload) =>
    axiosInstance.put<{ data: AdClient }>(`/ad-clients/${id}`, {
      ad_client_id: payload.ad_client_id,
      product_code: payload.product_code ?? null,
      product_name: payload.product_name ?? null,
    }),

  remove: (id: number) => axiosInstance.delete(`/ad-clients/${id}`),
}
