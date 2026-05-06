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
  ads_link_id: number | null
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
  user_email: string | null
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
  rt_click_ad_count: number
  rt_click_keyword_count: number
  rt_view_search_count: number
  rt_view_article_count: number
  cvr: number | null
  rt_cpa: number | null
  rt_cvr: number | null
  rt_ctr_keyword: number | null
  rt_ctr_search: number | null

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
  cvr: number
  rt_cpa: number
  rt_cvr: number
  rt_ctr_keyword: number
  rt_ctr_search: number
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
  account_ids?: string[]
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

// ─── Revenue Report Range ─────────────────────────────────────────────────────

export interface RevenueReportRangeItem {
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  channel_codes: string[]
}

export interface RevenueReportRangeQueryPayload {
  ranges: RevenueReportRangeItem[]
}

export interface RevenueReportRangeRow {
  range_label: string
  channel_code: string
  channel_name: string
  revenue_start: number | null
  revenue_end: number | null
  real_revenue: number | null
  conversion_start: number | null
  conversion_end: number | null
  real_conversion: number | null
  real_rpc: number | null
  cpc: number | null
}

export interface RevenueReportRangeQueryResponse {
  data: RevenueReportRangeRow[]
}

// ─── Tracking Analytics ───────────────────────────────────────────────────────

export interface TrackingAnalyticsFilterParams {
  ads_link_id?: number | null
  campaign_id?: string | null
  date_from?: string | null
  date_to?: string | null
}

export interface TrackingAnalyticsResponse {
  data: {
    views: {
      search_views: { value: number; ctr: number }
      article_views: { value: number }
    }
    clicks: {
      search_ad_clicks: { value: number; ctr: number; ctr_ldp: number }
      article_ad_clicks: { value: number; ctr: number }
    }
    loads: {
      failed_search_ad_loads: { value: number; ctr: number }
      failed_article_ad_loads: { value: number; ctr: number }
    }
  }
}

export interface AdsLinkOption {
  id: number
  slug: string
}

export interface AnalyticsTrackingFilterOptions {
  ads_links: AdsLinkOption[]
  campaigns: string[]
}

export interface AnalyticsTrackingFilterOptionsResponse {
  data: AnalyticsTrackingFilterOptions
}

// ─── Keyword Tracking ─────────────────────────────────────────────────────────

export type KeywordTrackingOrderBy = 'keyword' | 'click_count' | 'click_ad_count'

export interface KeywordTrackingFilterParams {
  ads_link_id?: number | null
  campaign_id?: string | null
  date_from?: string | null
  date_to?: string | null
  keyword?: string | null
  order?: 'asc' | 'desc' | null
  order_by?: KeywordTrackingOrderBy | null
  page?: number
  per_page?: number
}

export interface KeywordTrackingRow {
  id: number
  keyword: string
  click_count: number
  click_ad_count: number
  ctr: number
}

export interface KeywordTrackingListResponse {
  data: KeywordTrackingRow[]
  pagination: CampaignReportPagination
}

// ─── Campaign Rules ───────────────────────────────────────────────────────────

export type CampaignRuleEntityType = 'campaign' | 'ad_adset'

export type CampaignRuleOrderBy =
  | 'id'
  | 'title'
  | 'entity_type'
  | 'is_active'
  | 'expired_at'
  | 'created_at'

export interface CampaignRuleRow {
  id: number
  title: string
  code_rule: string
  entity_type: CampaignRuleEntityType
  is_active: boolean
  expired_at: string
  min_roi: string | null
  min_profit: string | null
  min_revenue: string | null
  min_spend: string | null
  start_hour: string | null
  end_hour: string | null
  user: { id?: number; name?: string | null; email?: string | null } | null
  apply_rules_count: number
  /** FB campaign_id, or mixed FB ad_id / adset_id (matches entity_type). */
  entity_ids: string[]
  created_at: string
  updated_at: string
}

export interface CampaignRuleCreatePayload {
  title: string
  entity_type: CampaignRuleEntityType
  is_active?: boolean
  expired_at?: string | null
  min_roi?: number | null
  min_profit?: number | null
  min_revenue?: number | null
  min_spend?: number | null
  start_hour?: string | null
  end_hour?: string | null
  entity_ids?: string[] | null
}

export interface CampaignRuleUpdatePayload {
  title?: string
  entity_type?: CampaignRuleEntityType
  is_active?: boolean
  expired_at?: string | null
  min_roi?: number | null
  min_profit?: number | null
  min_revenue?: number | null
  min_spend?: number | null
  start_hour?: string | null
  end_hour?: string | null
  entity_ids?: string[] | null
}

export interface CampaignRuleSingleResponse {
  data: CampaignRuleRow
}

export interface CampaignRuleFilterParams {
  entity_type?: CampaignRuleEntityType | null
  is_active?: boolean | null
  order?: 'asc' | 'desc' | null
  order_by?: CampaignRuleOrderBy | null
  page?: number
  per_page?: number
}

export interface CampaignRuleListResponse {
  data: CampaignRuleRow[]
  pagination: CampaignReportPagination
}

// ─── Campaign Schedules ───────────────────────────────────────────────────────

export type CampaignScheduleOrderBy =
  | 'id'
  | 'name'
  | 'is_active'
  | 'turn_on_time'
  | 'turn_off_time'
  | 'created_at'

export interface CampaignScheduleRow {
  id: number
  name: string
  turn_on_time: string | null
  turn_off_time: string | null
  is_active: boolean
  created_by: number
  creator: { id?: number; name?: string | null } | null
  campaign_ids: string[]
  items_count: number
  created_at: string
  updated_at: string
}

export interface CampaignScheduleFilterParams {
  campaign_id?: string | null
  is_active?: boolean | null
  name?: string | null
  order?: 'asc' | 'desc' | null
  order_by?: CampaignScheduleOrderBy | null
  page?: number
  per_page?: number
}

export interface CampaignScheduleListResponse {
  data: CampaignScheduleRow[]
  pagination: CampaignReportPagination
}

export interface CampaignScheduleSingleResponse {
  data: CampaignScheduleRow
}

export interface CampaignScheduleCreatePayload {
  name: string
  turn_on_time?: string | null
  turn_off_time?: string | null
  is_active?: boolean
  campaign_ids: string[]
}

export interface CampaignScheduleUpdatePayload {
  name?: string
  turn_on_time?: string | null
  turn_off_time?: string | null
  is_active?: boolean
  campaign_ids?: string[]
}

// ─── Campaign ID Selector ─────────────────────────────────────────────────────

export type CampaignSelectorOrderBy =
  | 'campaign_id'
  | 'campaign_name'
  | 'total_spend'
  | 'total_revenue'
  | 'profit'

export interface CampaignSelectorRow {
  campaign_id: string
  campaign_name: string | null
  account_id: string | null
  account_name: string | null
  total_spend: number
  total_revenue: number
  profit: number
}

export interface CampaignSelectorFilterParams {
  account_id?: string | null
  user_id?: number | null
  style_code?: string | null
  min_profit?: number | null
  min_revenue?: number | null
  min_spend?: number | null
  search?: string | null
  status?: string | null
  order?: 'asc' | 'desc' | null
  order_by?: CampaignSelectorOrderBy | null
  page?: number
  per_page?: number
}

export interface CampaignSelectorListResponse {
  data: CampaignSelectorRow[]
  pagination: CampaignReportPagination
}

// ─── Ads Selector ─────────────────────────────────────────────────────────────

export type AdsSelectorOrderBy = 'ad_id' | 'ad_name' | 'spend' | 'cpa' | 'date_start'

export interface AdsSelectorRow {
  ad_id: string | null
  ad_name: string | null
  adset_id: string | null
  campaign_id: string | null
  account_id: string | null
  date_start: string | null
  spend: number
  cpa: number
}

export interface AdsSelectorFilterParams {
  account_id?: string | null
  adset_id?: string | null
  campaign_id?: string | null
  date_start_from?: string | null
  date_start_to?: string | null
  max_cpa?: number | null
  min_spend?: number | null
  order?: 'asc' | 'desc' | null
  order_by?: AdsSelectorOrderBy | null
  page?: number | null
  per_page?: number | null
  search?: string | null
}

export interface AdsSelectorListResponse {
  data: AdsSelectorRow[]
  pagination: CampaignReportPagination
}

// ─── Adsets Selector ──────────────────────────────────────────────────────────

export type AdsetsSelectorOrderBy = 'adset_id' | 'adset_name' | 'spend' | 'cpa' | 'date_start'

export interface AdsetsSelectorRow {
  adset_id: string | null
  adset_name: string | null
  campaign_id: string | null
  account_id: string | null
  date_start: string | null
  spend: number
  cpa: number
}

export interface AdsetsSelectorFilterParams {
  account_id?: string | null
  campaign_id?: string | null
  date_start_from?: string | null
  date_start_to?: string | null
  max_cpa?: number | null
  min_spend?: number | null
  order?: 'asc' | 'desc' | null
  order_by?: AdsetsSelectorOrderBy | null
  page?: number | null
  per_page?: number | null
  search?: string | null
}

export interface AdsetsSelectorListResponse {
  data: AdsetsSelectorRow[]
  pagination: CampaignReportPagination
}

// ─── Ads/Adset Delivery Entities ───────────────────────────────────────────────

export type DeliveryEntityStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'PENDING_REVIEW'
  | 'DISAPPROVED'
  | 'PREAPPROVED'
  | 'PENDING_BILLING_INFO'
  | 'CAMPAIGN_PAUSED'
  | 'ARCHIVED'
  | 'ADSET_PAUSED'
  | 'IN_PROCESS'
  | 'WITH_ISSUES'
  | (string & {})

interface DeliveryInsightCommon {
  id: number
  campaign_id: string | null
  account_id: string | null
  status: DeliveryEntityStatus | null
  status_toggleable: boolean
  effective_status: string | null
  daily_budget: number | null
  spend: number | null
  date_start: string | null
  date_stop: string | null
  impressions: number | null
  clicks: number | null
  reach: number | null
  cpc: number | null
  cpm: number | null
  ctr: number | null
  cpa: number | null
  ad_clicks: number | null
  article_views: number | null
  search_views: number | null
  ads_conv: number | null
  inline_link_click_ctr: number | null
  cost_per_inline_link_click: number | null
  frequency: number | null
  conversion_realtime: number
  rpc_est: number | null
  revenue_est: number | null
  profit_realtime: number | null
  roi_realtime: number | null
  cpa_realtime: number | null
  updated_time: string | null
  created_time: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AdsetInsightRow extends DeliveryInsightCommon {
  adset_id: string | null
  adset_name: string | null
}

export interface AdsInsightRow extends DeliveryInsightCommon {
  ad_id: string | null
  ad_name: string | null
  adset_id: string | null
}

export interface DeliveryEntitiesFilterParams {
  date_from?: string | null
  date_to?: string | null
  created_time_from?: string | null
  created_time_to?: string | null
  status?: string | null
  adset_id?: string | null
  adset_name?: string | null
  ad_id?: string | null
  ad_name?: string | null
}

export interface DeliveryEntitiesListResponse {
  data: {
    adsets: AdsetInsightRow[]
    ads: AdsInsightRow[]
  }
}

export interface DeliveryEntityStatusOption {
  value: string
  label: string
}

export interface DeliveryEntityStatusOptionsResponse {
  data: {
    statuses: DeliveryEntityStatusOption[]
  }
}

export interface ToggleAdsetStatusResponse {
  data: AdsetInsightRow
}

export interface ToggleAdStatusResponse {
  data: AdsInsightRow
}
