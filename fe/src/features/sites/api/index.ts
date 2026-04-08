import { axiosInstance } from '@/shared/api/axios'
import type {
  Site,
  SiteCreateFormValues,
  SiteDetail,
  SiteFilterParams,
  SiteListResponse,
} from '@/features/sites/types'

export const sitesApi = {
  list: (page: number, perPage: number, filters: SiteFilterParams) =>
    axiosInstance.get<SiteListResponse>('/sites', {
      params: {
        page,
        per_page: perPage,
        ...(filters.keyword ? { keyword: filters.keyword } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.order ? { order: filters.order } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
      },
    }),

  getDetail: (id: number) => axiosInstance.get<{ data: SiteDetail }>(`/sites/${id}`),

  delete: (id: number) => axiosInstance.delete(`/sites/${id}`),

  update: (id: number, values: SiteCreateFormValues) =>
    axiosInstance.put<{ data: SiteDetail }>(`/sites/${id}`, {
      name: values.name,
      url: values.url,
      description: values.description ?? null,
      status: values.status ?? null,
      logo_id: values.logo?.id ?? null,
      favicon_id: values.favicon?.id ?? null,
      settings: {
        gtm: values.settings?.gtm ?? null,
        fb_pixel: values.settings?.fb_pixel ?? null,
        theme: values.settings?.theme ?? null,
      },
    }),

  create: (values: SiteCreateFormValues) =>
    axiosInstance.post<{ data: Site }>('/sites', {
      name: values.name,
      url: values.url,
      description: values.description ?? null,
      status: values.status ?? null,
      logo_id: values.logo?.id ?? null,
      favicon_id: values.favicon?.id ?? null,
      settings: {
        gtm: values.settings?.gtm ?? null,
        fb_pixel: values.settings?.fb_pixel ?? null,
        theme: values.settings?.theme ?? null,
      },
    }),
}
