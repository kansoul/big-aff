import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type {
  Account,
  AccountCreatePayload,
  AccountFilterParams,
  AccountListResponse,
  AccountOptionForAssign,
  AccountUpdatePayload,
} from '@/features/accounts/types'
import type { UserWithAccounts } from '@/features/accounts/types/userAccountAssignments'

export const accountsApi = {
  listUserAssignOptions: async (userId: number): Promise<AccountOptionForAssign[]> => {
    const response = await axiosInstance.get<{ data: AccountOptionForAssign[] }>(
      '/options/accounts',
      { params: { user_id: userId } },
    )
    return response.data.data
  },

  assignOptions: async (forUserId?: number): Promise<AccountOptionForAssign[]> => {
    const response = await axiosInstance.get<{ data: AccountOptionForAssign[] }>(
      '/accounts/assign-options',
      { params: forUserId != null ? { user_id: forUserId } : undefined },
    )
    return response.data.data
  },

  listUsersWithAccounts: async (params?: {
    page?: number
    per_page?: number
    query?: string
  }): Promise<{ data: UserWithAccounts[]; pagination: { last_page: number; total: number } }> => {
    const response = await axiosInstance.get<{
      data: UserWithAccounts[]
      pagination: { last_page: number; total: number }
    }>('/users/account-assignments', { params })
    return response.data
  },

  assignToUser: async (
    userId: number,
    accountIds: string[],
  ): Promise<{ skipped_account_ids: string[] }> => {
    const response = await axiosInstance.post<{ skipped_account_ids: string[] }>(
      `/users/${userId}/assign-accounts`,
      { account_ids: accountIds },
    )
    return response.data
  },

  mainTeamOptions: () =>
    axiosInstance.get<{ data: { id: number; name: string }[] }>('/revenue-stats/main-team-options'),

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
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  create: (payload: AccountCreatePayload) =>
    axiosInstance.post<{ data: Account }>('/accounts', {
      ads_type: payload.ads_type,
      business_center_id: payload.business_center_id ?? null,
      ...(Object.prototype.hasOwnProperty.call(payload, 'main_team_id')
        ? { main_team_id: payload.main_team_id ?? null }
        : {}),
      user_id: payload.user_id ?? null,
      status: payload.status ?? null,
      is_special: payload.is_special ?? false,
      sync_to_mcc: payload.sync_to_mcc ?? false,
      roas_enabled: payload.roas_enabled ?? false,
      gtag_enabled: payload.gtag_enabled ?? false,
      lines: payload.lines,
    }),

  update: (id: number, payload: AccountUpdatePayload) =>
    axiosInstance.put<{ data: Account }>(`/accounts/${id}`, {
      account_id: payload.account_id,
      account_name: payload.account_name ?? null,
      ads_type: payload.ads_type,
      business_center_id: payload.business_center_id ?? null,
      ...(Object.prototype.hasOwnProperty.call(payload, 'main_team_id')
        ? { main_team_id: payload.main_team_id ?? null }
        : {}),
      user_id: payload.user_id ?? null,
      status: payload.status ?? null,
      is_special: payload.is_special,
      sync_to_mcc: payload.sync_to_mcc,
      roas_enabled: payload.roas_enabled,
      gtag_enabled: payload.gtag_enabled,
    }),

  remove: (id: number) => axiosInstance.delete(`/accounts/${id}`),
}
