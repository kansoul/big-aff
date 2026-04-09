import { axiosInstance } from '@/shared/api/axios'
import type {
  AdsLink,
  AdsLinkCreatePayload,
  AdsLinkFilterParams,
  AdsLinkUpdatePayload,
  ChannelOption,
  Pagination,
  PostOption,
  SiteOption,
  UserOption,
} from '@/features/ads-links/types'

interface ListResponse {
  data: AdsLink[]
  pagination: Pagination
}

export const adsLinksApi = {
  async list(params?: AdsLinkFilterParams): Promise<ListResponse> {
    const res = await axiosInstance.get<ListResponse>('/ads-links', { params })
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

export const postOptionsApi = {
  async list(): Promise<PostOption[]> {
    const res = await axiosInstance.get<{ data: PostOption[] }>('/posts/options')
    return res.data.data
  },
}

export const channelOptionsApi = {
  async list(): Promise<ChannelOption[]> {
    const res = await axiosInstance.get<{ data: ChannelOption[] }>('/channels/options')
    return res.data.data
  },
}

export const siteOptionsApi = {
  async list(): Promise<SiteOption[]> {
    const res = await axiosInstance.get<{ data: SiteOption[] }>('/sites/options')
    return res.data.data
  },
}

export const userOptionsApi = {
  async list(): Promise<UserOption[]> {
    const res = await axiosInstance.get<{ data: UserOption[] }>('/users/options')
    return res.data.data
  },
}
