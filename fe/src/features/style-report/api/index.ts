import { axiosInstance } from '@/shared/api/axios'
import type {
  StyleReportFilterParams,
  StyleReportListResponse,
} from '@/features/style-report/types'

export const styleReportApi = {
  list: (filters: StyleReportFilterParams) =>
    axiosInstance.get<StyleReportListResponse>('/style-report', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),
}
