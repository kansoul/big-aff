export type SortDirection = 'asc' | 'desc'

export type CampaignRow = {
  campaign_id: string
  campaign_name: string
  external_campaign_id: string | null
  conversions: number
  revenue: number
  ctr: number
}

export type CampaignReportRow = {
  id: string
  name: string
  conversions: number
  revenue: number
  postback_timestamp: string | null
  visit_timestamp: string | null
  campaign_id: string
  campaign_name: string
}

export type Pagination = {
  page: number
  per_page: number
  total: number
  last_page: number
}

export type CampaignListFilters = {
  page: number
  per_page: number
  search: string
  order_by?: keyof CampaignRow
  order?: SortDirection
}

export type CampaignReportFilters = {
  page: number
  per_page: number
  search: string
  date_from: string | null
  date_to: string | null
  order_by?: keyof CampaignReportRow
  order?: SortDirection
}

export type ClickIdChartPoint = {
  label: string
  visits: number
  clicks: number
  conversions: number
  impressions: number
  revenue: number
}

export type CampaignListResponse = {
  data: CampaignRow[]
  pagination: Pagination
}

export type CampaignReportResponse = {
  data: CampaignReportRow[]
  pagination: Pagination
}

export type OfferRow = {
  id: string
  offer_name: string
  offer_id: string
  campaign_id: string
  campaign_name: string
  conversions: number
  revenue: number
}

export type OfferListFilters = {
  page: number
  per_page: number
  search: string
}

export type OfferListResponse = {
  data: OfferRow[]
  pagination: Pagination
}

export type WorkspaceView = 'campaigns' | 'offers' | 'click-ids'

export type CampaignWorkspaceTab = {
  id: string
  campaign: CampaignRow
  view: Exclude<WorkspaceView, 'campaigns'>
}
