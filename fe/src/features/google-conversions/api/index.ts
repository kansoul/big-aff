import { axiosInstance } from '@/shared/api/axios'
import type { ApiResponse } from '@/shared/types'
import type {
  GoogleConversionBulkUpdateRow,
  GoogleConversionFilterParams,
  GoogleConversionListResponse,
} from '@/features/google-conversions/types'

export const googleConversionsApi = {
  list: (filters: GoogleConversionFilterParams) =>
    axiosInstance.get<GoogleConversionListResponse>('/google-conversions', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  bulkUpdate: (rows: GoogleConversionBulkUpdateRow[]) =>
    axiosInstance.post<ApiResponse<void>>('/google-conversions/bulk-update', { rows }),

  bulkImport: (lines: string) =>
    axiosInstance.post<ApiResponse<{ imported: number }>>('/google-conversions/bulk-import', {
      lines,
    }),
}
