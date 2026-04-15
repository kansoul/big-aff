import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type { AdsReportFilterParams, AdsReportListResponse } from '@/features/ads-report/types'

export const adsReportApi = {
  list: (filters: AdsReportFilterParams) =>
    axiosInstance.get<AdsReportListResponse>('/ads-report', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.date_from ? { date_from: filters.date_from } : {}),
        ...(filters.date_to ? { date_to: filters.date_to } : {}),
        ...(!isNil(filters.main_team_id) ? { main_team_id: filters.main_team_id } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(!isNil(filters.account_id) ? { account_id: filters.account_id } : {}),
        ...(!isNil(filters.campaign_id) ? { campaign_id: filters.campaign_id } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),
}
