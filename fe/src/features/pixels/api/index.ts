import { axiosInstance } from '@/shared/api/axios'
import type {
  Pixel,
  PixelFilters,
  PixelFormValues,
  PixelListResponse,
} from '@/features/pixels/types'

export const pixelsApi = {
  list: async (params: PixelFilters) =>
    (await axiosInstance.get<PixelListResponse>('/pixels', { params })).data,
  create: async (data: PixelFormValues) =>
    (await axiosInstance.post<{ data: Pixel }>('/pixels', data)).data.data,
  update: async (id: number, data: PixelFormValues) =>
    (await axiosInstance.patch<{ data: Pixel }>(`/pixels/${id}`, data)).data.data,
  delete: async (id: number) => axiosInstance.delete(`/pixels/${id}`),
}
