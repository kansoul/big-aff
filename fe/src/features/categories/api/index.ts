import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type {
  Category,
  CategoryCreateFormValues,
  CategoryFilterParams,
  CategoryListResponse,
  CategoryUpdateFormValues,
} from '@/features/categories/types'

export const categoriesApi = {
  list: (page: number, perPage: number, filters: CategoryFilterParams) =>
    axiosInstance.get<CategoryListResponse>('/categories', {
      params: {
        page,
        per_page: perPage,
        ...(filters.query ? { query: filters.query } : {}),
        ...(!isNil(filters.parent_id) ? { parent_id: filters.parent_id } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  create: (values: CategoryCreateFormValues) => {
    const fd = new FormData()
    fd.append('name', values.name)
    if (values.description) fd.append('description', values.description)
    if (!isNil(values.parent_id)) fd.append('parent_id', String(values.parent_id))

    if (values.feature_image instanceof File) {
      fd.append('feature_image', values.feature_image)
    } else if (
      values.feature_image &&
      typeof values.feature_image === 'object' &&
      'id' in values.feature_image
    ) {
      fd.append('feature_media_id', String((values.feature_image as { id: number }).id))
    }

    return axiosInstance.post<{ data: Category }>('/categories', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getDetail: (id: number) => axiosInstance.get<{ data: Category }>(`/categories/${id}`),

  update: (id: number, values: CategoryUpdateFormValues) => {
    const fd = new FormData()
    fd.append('_method', 'PUT')
    if (!isNil(values.name)) fd.append('name', values.name)
    if (!isNil(values.description)) fd.append('description', values.description ?? '')
    if (!isNil(values.parent_id)) fd.append('parent_id', String(values.parent_id ?? ''))

    if (values.feature_image instanceof File) {
      fd.append('feature_image', values.feature_image)
    } else if (
      values.feature_image &&
      typeof values.feature_image === 'object' &&
      'id' in values.feature_image
    ) {
      fd.append('feature_media_id', String((values.feature_image as { id: number }).id))
    } else if (isNil(values.feature_image)) {
      fd.append('feature_media_id', '')
    }

    return axiosInstance.post<{ data: Category }>(`/categories/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  remove: (id: number) => axiosInstance.delete(`/categories/${id}`),
}
