import { axiosInstance } from '@/shared/api/axios'
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
        ...(filters.category_id != null ? { category_id: filters.category_id } : {}),
        ...(filters.lang ? { lang: filters.lang } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  create: (values: PostCreateFormValues) =>
    axiosInstance.post<{ data: Post }>('/posts', {
      title: values.title,
      slug: values.slug,
      lang: toNullable(values.lang),
      description: toNullable(values.description),
      content: toNullable(values.content),
      feature_media_id: values.feature_media?.id ?? null,
      status: toNullable(values.status),
      is_hidden: values.is_hidden ?? false,
      type: toNullable(values.type),
      category_id: values.category_id ?? null,
      published_at: toNullable(values.published_at),
    }),

  getDetail: (id: number) => axiosInstance.get<{ data: Post }>(`/posts/${id}`),

  update: (id: number, values: PostUpdateFormValues) =>
    axiosInstance.put<{ data: Post }>(`/posts/${id}`, {
      title: values.title,
      slug: values.slug,
      lang: toNullable(values.lang),
      description: toNullable(values.description),
      content: toNullable(values.content),
      feature_media_id: values.feature_media?.id ?? null,
      status: toNullable(values.status),
      is_hidden: values.is_hidden ?? false,
      type: toNullable(values.type),
      category_id: values.category_id ?? null,
      published_at: toNullable(values.published_at),
    }),

  remove: (id: number) => axiosInstance.delete(`/posts/${id}`),
}
