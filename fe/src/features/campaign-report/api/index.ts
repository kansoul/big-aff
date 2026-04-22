import { axiosInstance } from '@/shared/api/axios'
import type {
  CampaignReportFilterParams,
  CampaignReportFiltersResponse,
  CampaignReportListResponse,
  CampaignReportToggleStatusResponse,
  CampaignScheduleCreatePayload,
  CampaignScheduleFilterParams,
  CampaignScheduleListResponse,
  CampaignScheduleSingleResponse,
  CampaignScheduleUpdatePayload,
  KeywordTrackingFilterParams,
  KeywordTrackingListResponse,
  RevenueReportFilterParams,
  RevenueReportListResponse,
  StyleReportRangeQueryPayload,
  StyleReportRangeQueryResponse,
  TrackingAnalyticsFilterParams,
  TrackingAnalyticsResponse,
} from '@/features/campaign-report/types'

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

  listRevenue: (filters: RevenueReportFilterParams) =>
    axiosInstance.get<RevenueReportListResponse>('/revenue-reports', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        ...(filters.channel_codes?.length ? { 'channel_codes[]': filters.channel_codes } : {}),
        ...(filters.date_from ? { date_from: filters.date_from } : {}),
        ...(filters.date_to ? { date_to: filters.date_to } : {}),
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  queryRange: (payload: StyleReportRangeQueryPayload) =>
    axiosInstance.post<StyleReportRangeQueryResponse>('/style-report-range/query', payload),

  trackingAnalyticsStats: (filters: TrackingAnalyticsFilterParams) =>
    axiosInstance.get<TrackingAnalyticsResponse>('/analytics-tracking/stats', {
      params: {
        ...(filters.account_id ? { account_id: filters.account_id } : {}),
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
        ...(filters.account_id ? { account_id: filters.account_id } : {}),
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

  createCampaignSchedule: (payload: CampaignScheduleCreatePayload) =>
    axiosInstance.post<CampaignScheduleSingleResponse>('/campaign-schedules', payload),

  updateCampaignSchedule: (id: number, payload: CampaignScheduleUpdatePayload) =>
    axiosInstance.put<CampaignScheduleSingleResponse>(`/campaign-schedules/${id}`, payload),

  deleteCampaignSchedule: (id: number) =>
    axiosInstance.delete(`/campaign-schedules/${id}`),
}
