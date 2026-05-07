import { axiosInstance } from '@/shared/api/axios'
import type {
  AdsReportStatsFilterParams,
  AdsReportStatsResponse,
  AdsReportOptionsResponse,
} from '@/features/ads-report/types'

export const adsReportApi = {
  stats: (filters: AdsReportStatsFilterParams) =>
    axiosInstance.get<AdsReportStatsResponse>('/ads-report/stats', {
      params: {
        ...(filters.account_ids?.length ? { 'account_ids[]': filters.account_ids } : {}),
        ...(filters.ads_types?.length ? { 'ads_types[]': filters.ads_types } : {}),
        ...(filters.campaign_ids?.length ? { 'campaign_ids[]': filters.campaign_ids } : {}),
        ...(filters.date_from ? { date_from: filters.date_from } : {}),
        ...(filters.date_to ? { date_to: filters.date_to } : {}),
        ...(filters.main_team_ids?.length ? { 'main_team_ids[]': filters.main_team_ids } : {}),
        ...(filters.team_ids?.length ? { 'team_ids[]': filters.team_ids } : {}),
      },
    }),

  options: () => axiosInstance.get<AdsReportOptionsResponse>('/options/ads-report'),
}
