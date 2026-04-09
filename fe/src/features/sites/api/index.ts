import { axiosInstance } from '@/shared/api/axios'
import type {
  Site,
  SiteCreateApiParams,
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

  update: (id: number, params: SiteCreateApiParams) =>
    axiosInstance.put<{ data: SiteDetail }>(`/sites/${id}`, {
      name: params.name,
      url: params.url,
      description: params.description ?? null,
      status: params.status ?? null,
      logo_id: params.logo_id ?? null,
      favicon_id: params.favicon_id ?? null,
      settings: {
        gtm: params.settings?.gtm ?? null,
        fb_pixel: params.settings?.fb_pixel ?? null,
        theme: params.settings?.theme ?? null,
        default_channel: params.settings.default_channel,
        default_style: params.settings.default_style,
      },
    }),

  create: (params: SiteCreateApiParams) =>
    axiosInstance.post<{ data: Site }>('/sites', {
      name: params.name,
      url: params.url,
      description: params.description ?? null,
      status: params.status ?? null,
      logo_id: params.logo_id ?? null,
      favicon_id: params.favicon_id ?? null,
      settings: {
        gtm: params.settings?.gtm ?? null,
        fb_pixel: params.settings?.fb_pixel ?? null,
        theme: params.settings?.theme ?? null,
        default_channel: params.settings.default_channel,
        default_style: params.settings.default_style,
      },
    }),
}
