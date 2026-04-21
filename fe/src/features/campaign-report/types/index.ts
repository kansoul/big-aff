export type CampaignReportOrderBy =
  | 'id'
  | 'date_start'
  | 'account_id'
  | 'account_name'
  | 'campaign_id'
  | 'campaign_name'
  | 'ads_type'
  | 'channel_code'
  | 'channel_name'
  | 'daily_budget'
  | 'lifetime_budget'
  | 'r_search_views'
  | 'r_conversion'
  | 'r_revenue'
  | 'r_rpc'
  | 'r_ad_requests'
  | 'r_ad_requests_rpm'
  | 'r_impressions'
  | 'r_impressions_rpm'
  | 'r_funnel_requests'
  | 'r_funnel_clicks'
  | 'r_funnel_impressions'
  | 'r_funnel_rpm'
  | 'r_cpa'
  | 'a_ad_clicks'
  | 'a_article_views'
  | 'a_search_views'
  | 'a_conversion'
  | 'a_spend'
  | 'a_impressions'
  | 'a_cpc'
  | 'a_cpm'
  | 'a_ctr'
  | 'a_reach'
  | 'a_cpa'
  | 'a_ctr_link'
  | 'a_cpc_link'
  | 'a_frequency'
  | 'a_clicks'

export type CampaignReportOrder = 'asc' | 'desc'

export type CampaignReportGroupBy = '' | 'channel_code' | 'account_id' | 'user_id' | 'campaign_id'

export interface CampaignReportRealtime {
  id: number
  link_data_id: number | null
  view_article_count: number
  view_search_count: number
  click_keyword_count: number
  click_ad_count: number
}

export interface CampaignReportRow {
  id: number
  date_start: string | null
  realtime_report_id: number | null

  account_id: string | number | null
  account_name: string | null
  campaign_id: string
  campaign_name: string | null
  campaign_status: string | null
  has_rule?: boolean | null
  ads_type: string | null
  site_url?: string | null
  slug?: string | null
  ads_manager_link?: string | null
  daily_budget: string | number | null
  lifetime_budget: string | number | null

  channel_code: string | null
  channel_name: string | null

  r_search_views: number
  r_conversion: number
  r_revenue: string | number
  r_rpc: string | number
  r_ad_requests: number
  r_ad_requests_rpm: string | number
  r_impressions: number
  r_impressions_rpm: string | number
  r_funnel_requests: number
  r_funnel_clicks: number
  r_funnel_impressions: number
  r_funnel_rpm: string | number
  r_cpa: string | number

  a_ad_clicks: number
  a_article_views: number
  a_search_views: number
  a_conversion: number
  a_spend: string | number
  a_impressions: number
  a_cpc: string | number
  a_cpm: string | number
  a_ctr: string | number
  a_reach: number
  a_cpa: string | number
  a_ctr_link: string | number
  a_cpc_link: string | number
  a_frequency: string | number
  a_clicks: number

  revenue_est: number
  profit: number
  roi: number
  roi_realtime: number

  realtime_report: CampaignReportRealtime | null
}

export interface CampaignReportSummary {
  record_count: number
  daily_budget: number
  lifetime_budget: number
  r_search_views: number
  r_conversion: number
  r_revenue: number
  r_rpc: number
  r_ad_requests: number
  r_ad_requests_rpm: number
  r_impressions: number
  r_impressions_rpm: number
  r_funnel_requests: number
  r_funnel_clicks: number
  r_funnel_impressions: number
  r_funnel_rpm: number
  r_cpa: number
  a_ad_clicks: number
  a_article_views: number
  a_search_views: number
  a_conversion: number
  a_spend: number
  a_impressions: number
  a_cpc: number
  a_cpm: number
  a_ctr: number
  a_reach: number
  a_clicks: number
  a_cpa: number
  a_ctr_link: number
  a_cpc_link: number
  a_frequency: number
  revenue: number
  revenue_est: number
  profit: number
  roi: number
  roi_realtime: number
  rt_click_ad_count: number
  rt_click_keyword_count: number
  rt_view_search_count: number
  rt_view_article_count: number
}

export interface CampaignReportGroupRow {
  is_group: true
  group_key: string | number | null
  group_label: string | null
  record_count: number
  group_summary: CampaignReportSummary
  items: CampaignReportRow[]
}

export type CampaignReportDataRow = CampaignReportRow | CampaignReportGroupRow

export interface CampaignReportPagination {
  current_page: number
  from: number | null
  to: number | null
  last_page: number
  last_page_url: string | null
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  total: number
}

export interface CampaignReportListResponse {
  /**
   * When `group_by` is set, elements are `CampaignReportGroupRow` (one representative
   * row per group, with its underlying campaign reports exposed as `items`).
   * Otherwise, elements are flat `CampaignReportRow` values.
   */
  data: CampaignReportDataRow[]
  pagination: CampaignReportPagination
  grand_summary: CampaignReportSummary
  group_by: CampaignReportGroupBy | null
}

export interface CampaignReportFiltersResponse {
  data: {
    users: Array<{ id: number; name: string }>
    accounts: Array<{
      id: number
      account_id: string
      account_name: string | null
      ads_type: string | null
    }>
    campaigns: Array<{
      campaign_id: string
      campaign_name: string | null
      ads_type: string | null
      account_id: string | null
    }>
    channels: Array<{ code: string; name: string | null }>
    link_data_ids: Array<{
      id: number
      campaign_id: string | null
      channel_code: string | null
    }>
    ads_types: Array<{ value: string; label: string }>
  }
}

export interface CampaignReportToggleStatusResponse {
  data: {
    campaign_id: string
    status: string
  }
}

export interface CampaignReportFilterParams {
  date_from?: string | null
  date_to?: string | null
  user_ids?: number[]
  account_ids?: number[]
  ads_type?: string | null
  campaign_ids?: string[]
  channel_codes?: string[]
  link_data_ids?: number[]
  group_by?: CampaignReportGroupBy
  order_by?: CampaignReportOrderBy | null
  order?: CampaignReportOrder | null
  page?: number
  per_page?: number
}
