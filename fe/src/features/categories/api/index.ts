import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type {
  Category,
  CategoryCreateApiParams,
  CategoryFilterParams,
  CategoryListResponse,
  CategoryUpdateApiParams,
} from '@/features/categories/types'

export const categoriesApi = {
  list: (filters: CategoryFilterParams) =>
    axiosInstance.get<CategoryListResponse>('/categories', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.query ? { query: filters.query } : {}),
        ...(!isNil(filters.parent_id) ? { parent_id: filters.parent_id } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  create: (params: CategoryCreateApiParams) => {
    const fd = new FormData()
    fd.append('name', params.name)
    if (params.description) fd.append('description', params.description)
    if (!isNil(params.parent_id)) fd.append('parent_id', String(params.parent_id))
    if (!isNil(params.feature_media_id))
      fd.append('feature_media_id', String(params.feature_media_id))

    return axiosInstance.post<{ data: Category }>('/categories', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getDetail: (id: number) => axiosInstance.get<{ data: Category }>(`/categories/${id}`),

  update: (id: number, params: CategoryUpdateApiParams) => {
    const fd = new FormData()
    fd.append('_method', 'PUT')
    if (params.name) fd.append('name', params.name)
    if (!isNil(params.description)) fd.append('description', params.description ?? '')
    if (!isNil(params.parent_id)) fd.append('parent_id', String(params.parent_id ?? ''))
    // Send feature_media_id: number to set, empty string to clear
    fd.append(
      'feature_media_id',
      params.feature_media_id != null ? String(params.feature_media_id) : '',
    )

    return axiosInstance.post<{ data: Category }>(`/categories/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  remove: (id: number) => axiosInstance.delete(`/categories/${id}`),
}
