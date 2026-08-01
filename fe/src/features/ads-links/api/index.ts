import { axiosInstance } from '@/shared/api/axios'
import type {
  AdsLink,
  AdsLinkCreatePayload,
  AdsLinkFilterParams,
  AdsLinkUpdatePayload,
  Pagination,
  SiteOption,
  UserOption,
} from '@/features/ads-links/types'

interface ListResponse {
  data: AdsLink[]
  pagination: Pagination
}

export const adsLinksApi = {
  async list(params?: AdsLinkFilterParams): Promise<ListResponse> {
    const { date_range, ...rest } = params ?? {}
    const res = await axiosInstance.get<ListResponse>('/ads-links', {
      params: {
        ...rest,
        ...(date_range?.from ? { 'date_range.from': date_range.from } : {}),
        ...(date_range?.to ? { 'date_range.to': date_range.to } : {}),
      },
    })
    return res.data
  },

  async create(payload: AdsLinkCreatePayload): Promise<AdsLink> {
    const res = await axiosInstance.post<{ data: AdsLink }>('/ads-links', payload)
    return res.data.data
  },

  async update(id: number, payload: AdsLinkUpdatePayload): Promise<AdsLink> {
    const res = await axiosInstance.patch<{ data: AdsLink }>(`/ads-links/${id}`, payload)
    return res.data.data
  },

  async toggleHide(id: number): Promise<AdsLink> {
    const res = await axiosInstance.post<{ data: AdsLink }>(`/ads-links/${id}/toggle-hide`)
    return res.data.data
  },
}

export const siteOptionsApi = {
  async list(): Promise<SiteOption[]> {
    const res = await axiosInstance.get<{ data: SiteOption[] }>('/options/sites')
    return res.data.data
  },
}

export const userOptionsApi = {
  async list(): Promise<UserOption[]> {
    const res = await axiosInstance.get<{ data: UserOption[] }>('/options/users')
    return res.data.data
  },
}
