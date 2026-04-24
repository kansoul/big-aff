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

  async assignAccounts(userId: number, accountIds: number[]): Promise<void> {
    await axiosInstance.post(`/users/${userId}/assign-accounts`, { account_ids: accountIds })
  },

  async assignPosts(userId: number, postIds: number[]): Promise<void> {
    await axiosInstance.post(`/users/${userId}/assign-posts`, { post_ids: postIds })
  },

  listPostAssignments: (page: number, perPage: number, query?: string | null) =>
    axiosInstance.get<{
      data: Array<{ id: number; name: string; email: string; assigned_post_ids: number[] }>
      pagination: { total: number }
    }>('/users/post-assignments', {
      params: {
        page,
        per_page: perPage,
        order_by: 'name',
        order: 'asc',
        ...(query ? { query } : {}),
      },
    }),

  listOptions: () => axiosInstance.get<{ data: { id: number; name: string }[] }>('/users/options'),
}
