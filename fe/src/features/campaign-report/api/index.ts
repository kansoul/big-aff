import { axiosInstance } from '@/shared/api/axios'
import type {
  AdsetsSelectorFilterParams,
  AdsetsSelectorListResponse,
  AdsSelectorFilterParams,
  AdsSelectorListResponse,
  CampaignSelectorFilterParams,
  CampaignSelectorListResponse,
  CampaignReportFilterParams,
  CampaignReportFiltersResponse,
  CampaignReportListResponse,
  CampaignReportToggleStatusResponse,
  CampaignRuleCreatePayload,
  CampaignRuleFilterParams,
  CampaignRuleListResponse,
  CampaignRuleSingleResponse,
  CampaignRuleUpdatePayload,
  CampaignScheduleCreatePayload,
  CampaignScheduleFilterParams,
  CampaignScheduleListResponse,
  CampaignScheduleSingleResponse,
  CampaignScheduleUpdatePayload,
  DeliveryEntitiesFilterParams,
  DeliveryEntitiesListResponse,
  DeliveryEntityStatusOptionsResponse,
  AnalyticsTrackingFilterOptionsResponse,
  KeywordTrackingFilterParams,
  KeywordTrackingListResponse,
  RevenueReportRangeQueryPayload,
  RevenueReportRangeQueryResponse,
  ToggleAdsetStatusResponse,
  ToggleAdStatusResponse,
  TrackingAnalyticsFilterParams,
  TrackingAnalyticsResponse,
} from '../types'

function buildListParams(filters: CampaignReportFilterParams) {
  return {
    page: filters.page ?? 1,
    per_page: filters.per_page ?? 15,
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.user_ids?.length ? { 'user_ids[]': filters.user_ids } : {}),
    ...(filters.account_ids?.length ? { 'account_ids[]': filters.account_ids } : {}),
    ...(filters.ads_type ? { ads_type: filters.ads_type } : {}),
    ...(filters.campaign_ids?.length ? { 'campaign_ids[]': filters.campaign_ids } : {}),
    ...(filters.channel_codes?.length ? { 'channel_codes[]': filters.channel_codes } : {}),
    ...(filters.link_data_ids?.length ? { 'link_data_ids[]': filters.link_data_ids } : {}),
    ...(filters.group_by ? { group_by: filters.group_by } : {}),
    ...(filters.order_by ? { order_by: filters.order_by } : {}),
    ...(filters.order ? { order: filters.order } : {}),
  }
}

export const campaignReportApi = {
  list: (filters: CampaignReportFilterParams) =>
    axiosInstance.get<CampaignReportListResponse>('/campaign-reports', {
      params: buildListParams(filters),
    }),

  filters: () => axiosInstance.get<CampaignReportFiltersResponse>('/campaign-reports/filters'),

  toggleStatus: (campaignId: string, status: 'ACTIVE' | 'PAUSED') =>
    axiosInstance.post<CampaignReportToggleStatusResponse>(
      `/campaign-reports/${encodeURIComponent(campaignId)}/toggle-status`,
      { status },
    ),

  queryRange: (payload: RevenueReportRangeQueryPayload) =>
    axiosInstance.post<RevenueReportRangeQueryResponse>('/style-report-range/query', payload),

  analyticsTrackingFilterOptions: () =>
    axiosInstance.get<AnalyticsTrackingFilterOptionsResponse>('/analytics-tracking/filter-options'),

  trackingAnalyticsStats: (filters: TrackingAnalyticsFilterParams) =>
    axiosInstance.get<TrackingAnalyticsResponse>('/analytics-tracking/stats', {
      params: {
        ...(filters.ads_link_id ? { ads_link_id: filters.ads_link_id } : {}),
        ...(filters.campaign_id ? { campaign_id: filters.campaign_id } : {}),
        ...(filters.date_from ? { date_from: filters.date_from } : {}),
        ...(filters.date_to ? { date_to: filters.date_to } : {}),
      },
    }),

  listKeywords: (filters: KeywordTrackingFilterParams) =>
    axiosInstance.get<KeywordTrackingListResponse>('/analytics-tracking/keywords', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 30,
        ...(filters.ads_link_id ? { ads_link_id: filters.ads_link_id } : {}),
        ...(filters.campaign_id ? { campaign_id: filters.campaign_id } : {}),
        ...(filters.date_from ? { date_from: filters.date_from } : {}),
        ...(filters.date_to ? { date_to: filters.date_to } : {}),
        ...(filters.keyword ? { keyword: filters.keyword } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  listCampaignSchedules: (filters: CampaignScheduleFilterParams) =>
    axiosInstance.get<CampaignScheduleListResponse>('/campaign-schedules', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 30,
        ...(filters.campaign_id ? { campaign_id: filters.campaign_id } : {}),
        ...(filters.name ? { name: filters.name } : {}),
        ...(filters.is_active != null ? { is_active: filters.is_active } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  listCampaignSelector: (filters: CampaignSelectorFilterParams) =>
    axiosInstance.get<CampaignSelectorListResponse>('/campaigns/selector', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 30,
        ...(filters.account_id ? { account_id: filters.account_id } : {}),
        ...(filters.user_id != null ? { user_id: filters.user_id } : {}),
        ...(filters.style_code ? { style_code: filters.style_code } : {}),
        ...(filters.min_spend != null ? { min_spend: filters.min_spend } : {}),
        ...(filters.min_revenue != null ? { min_revenue: filters.min_revenue } : {}),
        ...(filters.min_profit != null ? { min_profit: filters.min_profit } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  listAdsSelector: (filters: AdsSelectorFilterParams) =>
    axiosInstance.get<AdsSelectorListResponse>('/campaigns/ads/selector', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 30,
        ...(filters.account_id ? { account_id: filters.account_id } : {}),
        ...(filters.adset_id ? { adset_id: filters.adset_id } : {}),
        ...(filters.campaign_id ? { campaign_id: filters.campaign_id } : {}),
        ...(filters.date_start_from ? { date_start_from: filters.date_start_from } : {}),
        ...(filters.date_start_to ? { date_start_to: filters.date_start_to } : {}),
        ...(filters.max_cpa != null ? { max_cpa: filters.max_cpa } : {}),
        ...(filters.min_spend != null ? { min_spend: filters.min_spend } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  listAdsetsSelector: (filters: AdsetsSelectorFilterParams) =>
    axiosInstance.get<AdsetsSelectorListResponse>('/campaigns/adsets/selector', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 30,
        ...(filters.account_id ? { account_id: filters.account_id } : {}),
        ...(filters.campaign_id ? { campaign_id: filters.campaign_id } : {}),
        ...(filters.date_start_from ? { date_start_from: filters.date_start_from } : {}),
        ...(filters.date_start_to ? { date_start_to: filters.date_start_to } : {}),
        ...(filters.max_cpa != null ? { max_cpa: filters.max_cpa } : {}),
        ...(filters.min_spend != null ? { min_spend: filters.min_spend } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  createCampaignSchedule: (payload: CampaignScheduleCreatePayload) =>
    axiosInstance.post<CampaignScheduleSingleResponse>('/campaign-schedules', payload),

  updateCampaignSchedule: (id: number, payload: CampaignScheduleUpdatePayload) =>
    axiosInstance.put<CampaignScheduleSingleResponse>(`/campaign-schedules/${id}`, payload),

  deleteCampaignSchedule: (id: number) => axiosInstance.delete(`/campaign-schedules/${id}`),

  createCampaignRule: (payload: CampaignRuleCreatePayload) =>
    axiosInstance.post<CampaignRuleSingleResponse>('/campaign-rules', payload),

  updateCampaignRule: (id: number, payload: CampaignRuleUpdatePayload) =>
    axiosInstance.put<CampaignRuleSingleResponse>(`/campaign-rules/${id}`, payload),

  deleteCampaignRule: (id: number) => axiosInstance.delete(`/campaign-rules/${id}`),

  listCampaignRules: (filters: CampaignRuleFilterParams) =>
    axiosInstance.get<CampaignRuleListResponse>('/campaign-rules', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 30,
        ...(filters.entity_type ? { entity_type: filters.entity_type } : {}),
        ...(filters.is_active != null ? { is_active: filters.is_active ? '1' : '0' } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  listDeliveryEntities: (campaignId: string, filters: DeliveryEntitiesFilterParams) =>
    axiosInstance.get<DeliveryEntitiesListResponse>(
      `/campaign-reports/${encodeURIComponent(campaignId)}/delivery-entities-reports`,
      {
        params: {
          ...(filters.date_from ? { date_from: filters.date_from } : {}),
          ...(filters.date_to ? { date_to: filters.date_to } : {}),
          ...(filters.created_time_from ? { created_time_from: filters.created_time_from } : {}),
          ...(filters.created_time_to ? { created_time_to: filters.created_time_to } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.adset_id ? { adset_id: filters.adset_id } : {}),
          ...(filters.adset_name ? { adset_name: filters.adset_name } : {}),
          ...(filters.ad_id ? { ad_id: filters.ad_id } : {}),
          ...(filters.ad_name ? { ad_name: filters.ad_name } : {}),
        },
      },
    ),

  deliveryEntityStatusOptions: () =>
    axiosInstance.get<DeliveryEntityStatusOptionsResponse>(
      '/campaign-reports/delivery-entities-reports/status-options',
    ),

  toggleAdsetStatus: (adsetInsightId: number, status: 'ACTIVE' | 'PAUSED') =>
    axiosInstance.patch<ToggleAdsetStatusResponse>(
      `/campaign-reports/adsets/${adsetInsightId}/toggle-status`,
      { status },
    ),

  toggleAdStatus: (adsInsightId: number, status: 'ACTIVE' | 'PAUSED') =>
    axiosInstance.patch<ToggleAdStatusResponse>(
      `/campaign-reports/ads/${adsInsightId}/toggle-status`,
      { status },
    ),
}
