import { axiosInstance } from '@/shared/api/axios'
import type { MediaFile, MediaFilterParams, MediaListResponse } from '@/features/media/types'

export const mediaApi = {
  list: (page: number, perPage: number, filters: MediaFilterParams) =>
    axiosInstance.get<MediaListResponse>('/files', {
      params: {
        page,
        per_page: perPage,
        ...(filters.created_from ? { created_from: filters.created_from } : {}),
        ...(filters.created_to ? { created_to: filters.created_to } : {}),
        ...(filters.order ? { order: filters.order } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.user_id != null ? { user_id: filters.user_id } : {}),
      },
    }),

  detail: (id: number) => axiosInstance.get<{ data: MediaFile }>(`/files/${id}`),

  delete: (id: number) => axiosInstance.delete(`/files/${id}`),

  upload: (
    file: File,
    options: { disk?: string | null; directory?: string | null; alt_text?: string | null },
    onProgress?: (percent: number) => void,
  ) => {
    const form = new FormData()
    form.append('file', file)
    if (options.disk) form.append('disk', options.disk)
    if (options.directory) form.append('directory', options.directory)
    if (options.alt_text) form.append('alt_text', options.alt_text)
    return axiosInstance.post<{ data: MediaFile }>('/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
      },
    })
  },
}
