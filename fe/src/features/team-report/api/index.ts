import { axiosInstance } from '@/shared/api/axios'
import type {
  TeamReportByTeamResponse,
  TeamReportByUserResponse,
  TeamOverviewResponse,
  TeamReportFilterParams,
} from '@/features/team-report/types'

function buildParams(filters: TeamReportFilterParams) {
  return {
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.team_ids?.length ? { 'team_ids[]': filters.team_ids } : {}),
    ...(filters.user_ids?.length ? { 'user_ids[]': filters.user_ids } : {}),
  }
}

export const teamReportApi = {
  teamOptions: () =>
    axiosInstance.get<{ data: { id: number; name: string }[] }>('/revenue-stats/team-options'),

  userOptions: (teamId: number) =>
    axiosInstance.get<{ data: { id: number; name: string }[] }>(
      `/revenue-stats/teams/${teamId}/user-options`,
    ),

  overview: (filters: TeamReportFilterParams) =>
    axiosInstance.get<TeamOverviewResponse>('/revenue-stats/overview', {
      params: buildParams(filters),
    }),

  byTeam: (filters: TeamReportFilterParams) =>
    axiosInstance.get<TeamReportByTeamResponse>('/revenue-stats/by-team', {
      params: buildParams(filters),
    }),

  byUser: (filters: TeamReportFilterParams) =>
    axiosInstance.get<TeamReportByUserResponse>('/revenue-stats/by-user', {
      params: buildParams(filters),
    }),
}
