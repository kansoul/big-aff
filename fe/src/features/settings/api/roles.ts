import type { RoleCreatePayload, RoleUpdatePayload } from '@/features/settings/types'
import { axiosInstance } from '@/shared/api/axios'
import type { ApiResponse, Role } from '@/shared/types'

export const rolesApi = {
  async list(): Promise<Role[]> {
    const response = await axiosInstance.get<ApiResponse<Role[]>>('/roles')
    return response.data.data
  },

  listOptions: () => axiosInstance.get<{ data: { id: number; name: string }[] }>('/roles/options'),

  async create(payload: RoleCreatePayload): Promise<Role> {
    const response = await axiosInstance.post<ApiResponse<Role>>('/roles', payload)
    return response.data.data
  },

  async update(id: number, payload: RoleUpdatePayload): Promise<Role> {
    const response = await axiosInstance.put<ApiResponse<Role>>(`/roles/${id}`, payload)
    return response.data.data
  },

  async remove(id: number): Promise<void> {
    await axiosInstance.delete(`/roles/${id}`)
  },
}
