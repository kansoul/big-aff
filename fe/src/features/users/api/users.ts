import type {
  ParentChildAssignmentsPayload,
  UserCreatePayload,
  UserFilterParams,
  UserListResponse,
  UserUpdatePayload,
} from '@/features/users/types'
import { axiosInstance } from '@/shared/api/axios'
import type { ApiResponse, ManagedUser } from '@/shared/types'

export const usersApi = {
  list: (page: number, perPage: number, filters: UserFilterParams) =>
    axiosInstance.get<UserListResponse['data']>('/users', {
      params: {
        page,
        per_page: perPage,
        ...(filters.order ? { order: filters.order } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
      },
    }),

  async create(payload: UserCreatePayload): Promise<ManagedUser> {
    const response = await axiosInstance.post<ApiResponse<ManagedUser>>('/users', payload)
    return response.data.data
  },

  async update(id: number, payload: UserUpdatePayload): Promise<ManagedUser> {
    const response = await axiosInstance.put<ApiResponse<ManagedUser>>(`/users/${id}`, payload)
    return response.data.data
  },

  async remove(id: number): Promise<void> {
    await axiosInstance.delete(`/users/${id}`)
  },

  async listParentChildAssignments(): Promise<ParentChildAssignmentsPayload> {
    const response = await axiosInstance.get<ApiResponse<ParentChildAssignmentsPayload>>(
      '/users/parent-child-assignments',
    )
    return response.data.data
  },

  async syncParentChildren(
    parentId: number,
    childIds: number[],
  ): Promise<ParentChildAssignmentsPayload> {
    const response = await axiosInstance.put<ApiResponse<ParentChildAssignmentsPayload>>(
      `/users/${parentId}/parent-children`,
      { child_ids: childIds },
    )
    return response.data.data
  },
}
