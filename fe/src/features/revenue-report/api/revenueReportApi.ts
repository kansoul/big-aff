import { axiosInstance } from '@/shared/api/axios'
import type { RevenueReportFilterParams, RevenueReportListResponse } from '../types'

export const revenueReportApi = {
  listRevenue: (filters: RevenueReportFilterParams) =>
    axiosInstance.get<RevenueReportListResponse>('/revenue-reports', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.campaign_ids?.length ? { 'campaign_ids[]': filters.campaign_ids } : {}),
        ...(filters.date_from ? { date_from: filters.date_from } : {}),
        ...(filters.date_to ? { date_to: filters.date_to } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),
}
