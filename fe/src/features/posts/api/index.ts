import { axiosInstance } from '@/shared/api/axios'
import { isNil } from '@/lib/utils'
import type {
  Post,
  PostCreateFormValues,
  PostFilterParams,
  PostListResponse,
  PostUpdateFormValues,
} from '@/features/posts/types'

function toNullable<T>(value: T | null | undefined): T | null {
  return value ?? null
}

export const postsApi = {
  list: (page: number, perPage: number, filters: PostFilterParams) =>
    axiosInstance.get<PostListResponse>('/posts', {
      params: {
        page,
        per_page: perPage,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(!isNil(filters.category_id) ? { category_id: filters.category_id } : {}),
        ...(filters.lang ? { lang: filters.lang } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(!isNil(filters.created_by) ? { created_by: filters.created_by } : {}),
        ...(filters.created_at_from ? { created_at_from: filters.created_at_from } : {}),
        ...(filters.created_at_to ? { created_at_to: filters.created_at_to } : {}),
        ...(!isNil(filters.is_hidden) ? { is_hidden: filters.is_hidden } : {}),
        ...(filters.deleted_at ? { deleted_at: filters.deleted_at } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  create: (values: PostCreateFormValues) =>
    axiosInstance.post<{ data: Post }>('/posts', {
      title: values.title,
      lang: toNullable(values.lang),
      note: toNullable(values.note),
      description: toNullable(values.description),
      content: toNullable(values.content),
      feature_media_id: values.feature_media_id ?? null,
      status: toNullable(values.status),
      is_hidden: values.is_hidden ?? false,
      type: toNullable(values.type),
      category_id: values.category_id ?? null,
      published_at: toNullable(values.published_at),
      keyword_set_ids: values.keyword_set_ids ?? null,
    }),

  getDetail: (id: number) => axiosInstance.get<{ data: Post }>(`/posts/${id}`),

  update: (id: number, values: PostUpdateFormValues) =>
    axiosInstance.put<{ data: Post }>(`/posts/${id}`, {
      title: values.title,
      lang: toNullable(values.lang),
      note: toNullable(values.note),
      description: toNullable(values.description),
      content: toNullable(values.content),
      feature_media_id: values.feature_media_id ?? null,
      status: toNullable(values.status),
      is_hidden: values.is_hidden ?? false,
      type: toNullable(values.type),
      category_id: values.category_id ?? null,
      published_at: toNullable(values.published_at),
      keyword_set_ids: values.keyword_set_ids ?? null,
    }),

  remove: (id: number) => axiosInstance.delete(`/posts/${id}`),

  publish: (id: number, publish: boolean) =>
    axiosInstance.post<{ data: Post }>(`/posts/${id}/publish`, { publish }),

  toggleHidden: (id: number, isHidden: boolean) =>
    axiosInstance.post<{ data: Post }>(`/posts/${id}/toggle-hidden`, { is_hidden: isHidden }),
}

export const userOptionsApi = {
  async list(): Promise<{ label: string; value: string }[]> {
    const res = await axiosInstance.get<{ data: { id: number; name: string }[] }>('/options/users')
    return res.data.data.map((u) => ({ label: u.name, value: String(u.id) }))
  },
}
