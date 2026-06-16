import { axiosInstance } from '@/shared/api/axios'
import type { ApiResponse } from '@/shared/types'
import type {
  GtagBulkUpdateRow,
  GtagFilterParams,
  GtagListResponse,
} from '@/features/gtags/types'

export const gtagsApi = {
  list: (filters: GtagFilterParams) =>
    axiosInstance.get<GtagListResponse>('/gtags', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  bulkUpdate: (rows: GtagBulkUpdateRow[]) =>
    axiosInstance.post<ApiResponse<void>>('/gtags/bulk-update', { rows }),

  bulkImport: (lines: string) =>
    axiosInstance.post<ApiResponse<{ processed: number; skipped: number }>>('/gtags/bulk-import', {
      lines,
    }),
}
