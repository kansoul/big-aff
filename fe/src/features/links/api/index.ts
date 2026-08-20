import { axiosInstance } from '@/shared/api/axios'
import type {
  Link,
  LinkFilterParams,
  LinkFormValues,
  LinkListResponse,
} from '@/features/links/types'

export const linksApi = {
  async list(params?: LinkFilterParams): Promise<LinkListResponse> {
    const response = await axiosInstance.get<LinkListResponse>('/links', { params })
    return response.data
  },

  async create(payload: LinkFormValues): Promise<Link> {
    const response = await axiosInstance.post<{ data: Link }>('/links', payload)
    return response.data.data
  },

  async update(id: number, payload: LinkFormValues): Promise<Link> {
    const response = await axiosInstance.patch<{ data: Link }>(`/links/${id}`, payload)
    return response.data.data
  },

  async delete(id: number): Promise<void> {
    await axiosInstance.delete(`/links/${id}`)
  },
}
