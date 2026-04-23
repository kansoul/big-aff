export type AdsReportAdsType = 'facebook' | 'google'

export interface AdsReportStatsCampaigns {
  total: number
  active: number
  paused: number
  archived: number
}

export interface AdsReportSpendByCurrency {
  currency: string
  amount: string
}

export interface AdsReportStatsData {
  campaigns: AdsReportStatsCampaigns
  spend_by_currency: AdsReportSpendByCurrency[]
  total_reach: number
  show_revenue_profit: boolean
  revenue: string | null
  profit: string | null
}

export interface AdsReportStatsResponse {
  data: AdsReportStatsData
}

export interface AdsReportStatsFilterParams {
  account_id?: string | null
  ads_type?: AdsReportAdsType | null
  campaign_ids?: string[]
  date_from?: string | null
  date_to?: string | null
  team_id?: number | null
}
