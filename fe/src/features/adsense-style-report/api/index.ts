import { axiosInstance } from '@/shared/api/axios'
import type {
  AdsenseStyleReportFilterParams,
  AdsenseStyleReportListResponse,
} from '@/features/adsense-style-report/types'

export const adsenseStyleReportApi = {
  list: (filters: AdsenseStyleReportFilterParams) =>
    axiosInstance.get<AdsenseStyleReportListResponse>('/adsense-style-report', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),
}
