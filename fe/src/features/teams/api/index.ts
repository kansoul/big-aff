import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type {
  Team,
  TeamCreatePayload,
  TeamFilterParams,
  TeamListResponse,
  TeamUpdatePayload,
  TeamUserOptionsResponse,
} from '@/features/teams/types'

export const teamsApi = {
  list: (filters: TeamFilterParams) =>
    axiosInstance.get<TeamListResponse>('/teams', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  create: (payload: TeamCreatePayload) =>
    axiosInstance.post<{ data: Team }>('/teams', {
      name: payload.name,
      description: !isNil(payload.description) ? payload.description : null,
    }),

  update: (id: number, payload: TeamUpdatePayload) =>
    axiosInstance.put<{ data: Team }>(`/teams/${id}`, {
      ...(payload.name ? { name: payload.name } : {}),
      description: !isNil(payload.description) ? payload.description : null,
    }),

  listOptions: () => axiosInstance.get<{ data: { id: number; name: string }[] }>('/teams/options'),

  userOptions: (teamId: number) =>
    axiosInstance.get<TeamUserOptionsResponse>(`/teams/${teamId}/user-options`),

  assignUsers: (teamId: number, userIds: number[]) =>
    axiosInstance.post(`/teams/${teamId}/assign-users`, { user_ids: userIds }),

  remove: (id: number) => axiosInstance.delete(`/teams/${id}`),
}
