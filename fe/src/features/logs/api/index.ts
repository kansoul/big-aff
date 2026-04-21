import { axiosInstance } from '@/shared/api/axios'
import type {
  LogEntryResponse,
  LogFilesResponse,
  LogFilters,
  LogListResponse,
  LogTailResponse,
} from '@/features/logs/types'

export const logsApi = {
  files: () => axiosInstance.get<LogFilesResponse>('/logs/files'),

  list: (page: number, perPage: number, filters: LogFilters) =>
    axiosInstance.get<LogListResponse>('/logs', {
      params: {
        page,
        per_page: perPage,
        ...(filters.file ? { file: filters.file } : {}),
        ...(filters.level ? { level: filters.level } : {}),
        ...(filters.keyword ? { keyword: filters.keyword } : {}),
      },
    }),

  tail: (file: string | null, limit = 100) =>
    axiosInstance.get<LogTailResponse>('/logs/tail', {
      params: {
        ...(file ? { file } : {}),
        limit,
      },
    }),

  clear: () => axiosInstance.delete('/logs/clear'),

  show: (id: string) => axiosInstance.get<LogEntryResponse>(`/logs/${id}`),
}
