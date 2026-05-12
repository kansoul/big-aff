import { axiosInstance } from '@/shared/api/axios'
import type {
  AdxAccount,
  AdxAccountConversion,
  AdxAccountConversionFilterParams,
  AdxAccountConversionFormValues,
  AdxAccountFilterParams,
  AdxAccountFormValues,
  AdxCampaign,
  AdxCampaignFilterParams,
  AdxCampaignReport,
  AdxCampaignReportFilterParams,
  AdxGame,
  AdxGameFilterParams,
  AdxGameFormValues,
  AdxLink,
  AdxLinkFilterParams,
  AdxLinkFormValues,
  ListResponse,
} from '@/features/adx/types'

function compactParams<T extends Record<string, unknown>>(params: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== null && value !== undefined && value !== '',
    ),
  )
}

export const adxApi = {
  listAccounts: (filters: AdxAccountFilterParams) =>
    axiosInstance.get<ListResponse<AdxAccount>>('/adx/accounts', {
      params: compactParams({
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        query: filters.query,
        source: filters.source,
        status: filters.status,
        order_by: filters.order_by,
        order: filters.order,
      }),
    }),

  createAccount: (payload: AdxAccountFormValues) =>
    axiosInstance.post<{ data: AdxAccount }>('/adx/accounts', payload),

  updateAccount: (id: number, payload: Partial<AdxAccountFormValues>) =>
    axiosInstance.patch<{ data: AdxAccount }>(`/adx/accounts/${id}`, payload),

  deleteAccount: (id: number) => axiosInstance.delete(`/adx/accounts/${id}`),

  listGames: (filters: AdxGameFilterParams) =>
    axiosInstance.get<ListResponse<AdxGame>>('/adx/games', {
      params: compactParams({
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        keyword: filters.keyword,
        status: filters.status,
        order_by: filters.order_by,
        order: filters.order,
      }),
    }),

  createGame: (payload: AdxGameFormValues) =>
    axiosInstance.post<{ data: AdxGame }>('/adx/games', payload),

  updateGame: (id: number, payload: AdxGameFormValues) =>
    axiosInstance.patch<{ data: AdxGame }>(`/adx/games/${id}`, payload),

  deleteGame: (id: number) => axiosInstance.delete(`/adx/games/${id}`),

  listLinks: (filters: AdxLinkFilterParams) =>
    axiosInstance.get<ListResponse<AdxLink>>('/adx/links', {
      params: compactParams({
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        keyword: filters.keyword,
        adx_game_id: filters.adx_game_id,
        source: filters.source,
        status: filters.status,
        order_by: filters.order_by,
        order: filters.order,
      }),
    }),

  createLink: (payload: AdxLinkFormValues) =>
    axiosInstance.post<{ data: AdxLink }>('/adx/links', payload),

  updateLink: (id: number, payload: AdxLinkFormValues) =>
    axiosInstance.patch<{ data: AdxLink }>(`/adx/links/${id}`, payload),

  deleteLink: (id: number) => axiosInstance.delete(`/adx/links/${id}`),

  listCampaigns: (filters: AdxCampaignFilterParams) =>
    axiosInstance.get<ListResponse<AdxCampaign>>('/adx/campaigns', {
      params: compactParams({
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        keyword: filters.keyword,
        source: filters.source,
        adx_account_id: filters.adx_account_id,
        account_id: filters.account_id,
        campaign_id: filters.campaign_id,
        status: filters.status,
        order_by: filters.order_by,
        order: filters.order,
      }),
    }),

  listCampaignReports: (filters: AdxCampaignReportFilterParams) =>
    axiosInstance.get<ListResponse<AdxCampaignReport>>('/adx/reports/campaigns', {
      params: compactParams({
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        date_from: filters.date_from,
        date_to: filters.date_to,
        source: filters.source,
        account_id: filters.account_id,
        campaign_id: filters.campaign_id,
        order_by: filters.order_by,
        order: filters.order,
      }),
    }),

  listAccountConversions: (filters: AdxAccountConversionFilterParams) =>
    axiosInstance.get<ListResponse<AdxAccountConversion>>('/adx/account-conversions', {
      params: compactParams({
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        source: filters.source,
        account_id: filters.account_id,
        conversion_type: filters.conversion_type,
        status: filters.status,
        order_by: filters.order_by,
        order: filters.order,
      }),
    }),

  createAccountConversion: (payload: AdxAccountConversionFormValues) =>
    axiosInstance.post<{ data: AdxAccountConversion }>('/adx/account-conversions', payload),

  updateAccountConversion: (id: number, payload: Partial<AdxAccountConversionFormValues>) =>
    axiosInstance.patch<{ data: AdxAccountConversion }>(`/adx/account-conversions/${id}`, payload),

  deleteAccountConversion: (id: number) => axiosInstance.delete(`/adx/account-conversions/${id}`),
}
