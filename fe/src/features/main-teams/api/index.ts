import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type {
  MainTeam,
  MainTeamCreatePayload,
  MainTeamFilterParams,
  MainTeamListResponse,
  MainTeamUpdatePayload,
} from '@/features/main-teams/types'

export const mainTeamsApi = {
  list: (filters: MainTeamFilterParams) =>
    axiosInstance.get<MainTeamListResponse>('/main-teams', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  create: (payload: MainTeamCreatePayload) =>
    axiosInstance.post<{ data: MainTeam }>('/main-teams', {
      name: payload.name,
      description: !isNil(payload.description) ? payload.description : null,
      sync_campaign_reports: Boolean(payload.sync_campaign_reports),
      account_ids: payload.account_ids ?? [],
    }),

  update: (id: number, payload: MainTeamUpdatePayload) =>
    axiosInstance.put<{ data: MainTeam }>(`/main-teams/${id}`, {
      ...(payload.name ? { name: payload.name } : {}),
      description: !isNil(payload.description) ? payload.description : null,
      ...(payload.sync_campaign_reports != null
        ? { sync_campaign_reports: payload.sync_campaign_reports }
        : {}),
      ...(payload.account_ids ? { account_ids: payload.account_ids } : {}),
    }),

  remove: (id: number) => axiosInstance.delete(`/main-teams/${id}`),
}
