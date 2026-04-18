import { axiosInstance } from '@/shared/api/axios'
import type {
  RevenueByTeamResponse,
  RevenueByUserResponse,
  RevenueOverviewResponse,
  RevenueReportFilterParams,
} from '@/features/revenue-report/types'

function buildParams(filters: RevenueReportFilterParams) {
  return {
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.team_ids?.length ? { 'team_ids[]': filters.team_ids } : {}),
    ...(filters.user_ids?.length ? { 'user_ids[]': filters.user_ids } : {}),
  }
}

export const revenueReportApi = {
  overview: (filters: RevenueReportFilterParams) =>
    axiosInstance.get<RevenueOverviewResponse>('/revenue-stats/overview', {
      params: buildParams(filters),
    }),

  byTeam: (filters: RevenueReportFilterParams) =>
    axiosInstance.get<RevenueByTeamResponse>('/revenue-stats/by-team', {
      params: buildParams(filters),
    }),

  byUser: (filters: RevenueReportFilterParams) =>
    axiosInstance.get<RevenueByUserResponse>('/revenue-stats/by-user', {
      params: buildParams(filters),
    }),
}
