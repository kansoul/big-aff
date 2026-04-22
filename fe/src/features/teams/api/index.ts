import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type {
  TeamAssignUsersPayload,
  TeamAccountOptionsResponse,
  Team,
  TeamCreatePayload,
  TeamFilterParams,
  TeamLeadersResponse,
  TeamListResponse,
  TeamParentChildOptionsResponse,
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

  accountOptions: () => axiosInstance.get<TeamAccountOptionsResponse>('/teams/account-options'),

  userOptions: (teamId: number) =>
    axiosInstance.get<TeamUserOptionsResponse>(`/teams/${teamId}/user-options`),

  members: (teamId: number) =>
    axiosInstance.get<{ data: { id: number; name: string; email: string }[] }>(
      `/teams/${teamId}/members`,
    ),

  assignUsers: (teamId: number, payload: TeamAssignUsersPayload) =>
    axiosInstance.post(`/teams/${teamId}/assign-users`, payload),

  leaders: (teamId: number) => axiosInstance.get<TeamLeadersResponse>(`/teams/${teamId}/leaders`),

  parentChildOptions: (teamId: number) =>
    axiosInstance.get<TeamParentChildOptionsResponse>(`/teams/${teamId}/parent-child-options`),

  remove: (id: number) => axiosInstance.delete(`/teams/${id}`),
}
