import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type {
  Account,
  AccountCreatePayload,
  AccountFilterParams,
  AccountListResponse,
  AccountUpdatePayload,
} from '@/features/accounts/types'

export const accountsApi = {
  list: (filters: AccountFilterParams) =>
    axiosInstance.get<AccountListResponse>('/accounts', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.ads_type ? { ads_type: filters.ads_type } : {}),
        ...(!isNil(filters.business_center_id)
          ? { business_center_id: filters.business_center_id }
          : {}),
        ...(!isNil(filters.team_id) ? { team_id: filters.team_id } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  create: (payload: AccountCreatePayload) =>
    axiosInstance.post<{ data: Account }>('/accounts', {
      ads_type: payload.ads_type,
      business_center_id: payload.business_center_id ?? null,
      team_id: payload.team_id ?? null,
      status: payload.status ?? null,
      is_special: payload.is_special ?? false,
      sync_to_mcc: payload.sync_to_mcc ?? false,
      lines: payload.lines,
    }),

  update: (id: number, payload: AccountUpdatePayload) =>
    axiosInstance.put<{ data: Account }>(`/accounts/${id}`, {
      account_id: payload.account_id,
      account_name: payload.account_name ?? null,
      ads_type: payload.ads_type,
      business_center_id: payload.business_center_id ?? null,
      team_id: payload.team_id ?? null,
      status: payload.status ?? null,
      is_special: payload.is_special,
      sync_to_mcc: payload.sync_to_mcc,
    }),

  remove: (id: number) => axiosInstance.delete(`/accounts/${id}`),
}
