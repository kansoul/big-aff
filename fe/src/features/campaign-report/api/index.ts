import { axiosInstance } from '@/shared/api/axios'
import type {
  CampaignReportFilterParams,
  CampaignReportFiltersResponse,
  CampaignReportListResponse,
  CampaignReportToggleStatusResponse,
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
}
