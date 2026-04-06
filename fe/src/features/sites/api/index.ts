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

  update: (id: number, values: SiteCreateFormValues) => {
    const fd = new FormData()
    fd.append('_method', 'PUT')
    fd.append('name', values.name)
    fd.append('url', values.url)
    if (values.description !== undefined) fd.append('description', values.description)
    if (values.status !== undefined) fd.append('status', values.status)
    if (values.logo instanceof File) fd.append('logo', values.logo)
    if (values.favicon instanceof File) fd.append('favicon', values.favicon)
    if (values.settings?.gtm !== undefined) fd.append('settings[gtm]', values.settings.gtm)
    if (values.settings?.fb_pixel !== undefined)
      fd.append('settings[fb_pixel]', values.settings.fb_pixel)
    if (values.settings?.theme !== undefined) fd.append('settings[theme]', values.settings.theme)
    return axiosInstance.post<{ data: SiteDetail }>(`/sites/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  create: (values: SiteCreateFormValues) => {
    const fd = new FormData()
    fd.append('name', values.name)
    fd.append('url', values.url)
    if (values.description !== undefined) fd.append('description', values.description)
    if (values.status !== undefined) fd.append('status', values.status)
    if (values.logo instanceof File) fd.append('logo', values.logo)
    if (values.favicon instanceof File) fd.append('favicon', values.favicon)
    if (values.settings?.gtm !== undefined) fd.append('settings[gtm]', values.settings.gtm)
    if (values.settings?.fb_pixel !== undefined)
      fd.append('settings[fb_pixel]', values.settings.fb_pixel)
    if (values.settings?.theme !== undefined) fd.append('settings[theme]', values.settings.theme)
    return axiosInstance.post<{ data: Site }>('/sites', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
