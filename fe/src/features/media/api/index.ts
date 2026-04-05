import { axiosInstance } from '@/shared/api/axios'
import type { Media, MediaListResponse } from '@/features/media/types'

export const mediaApi = {
  list: (page = 1, perPage = 24) =>
    axiosInstance.get<MediaListResponse>('/api/media', {
      params: { page, per_page: perPage },
    }),

  upload: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return axiosInstance.post<{ success: boolean; message: string; data: Media }>(
      '/api/media',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total))
          }
        },
      },
    )
  },
}
