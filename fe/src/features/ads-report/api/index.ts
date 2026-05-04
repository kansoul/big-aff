import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type {
  AdsReportStatsFilterParams,
  AdsReportStatsResponse,
  AdsReportOptionsResponse,
} from '@/features/ads-report/types'

export const adsReportApi = {
  stats: (filters: AdsReportStatsFilterParams) =>
    axiosInstance.get<AdsReportStatsResponse>('/ads-report/stats', {
      params: {
        ...(filters.account_id ? { account_id: filters.account_id } : {}),
        ...(filters.ads_type ? { ads_type: filters.ads_type } : {}),
        ...(filters.campaign_ids?.length ? { 'campaign_ids[]': filters.campaign_ids } : {}),
        ...(filters.date_from ? { date_from: filters.date_from } : {}),
        ...(filters.date_to ? { date_to: filters.date_to } : {}),
        ...(!isNil(filters.team_id) ? { team_id: filters.team_id } : {}),
      },
    }),

  options: () => axiosInstance.get<AdsReportOptionsResponse>('/options/ads-report'),
}
