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
  account_ids?: string[]
  ads_types?: AdsReportAdsType[]
  campaign_ids?: string[]
  date_from?: string | null
  date_to?: string | null
  main_team_ids?: number[]
  team_ids?: number[]
}

export interface AdsReportOptionAccount {
  id: number
  account_id: string
  account_name: string | null
  ads_type: string
  main_team_id: number | null
}

export interface AdsReportOptionMainTeam {
  id: number
  name: string
}

export interface AdsReportOptionTeam {
  id: number
  name: string
  accounts: AdsReportOptionAccount[]
}

export interface AdsReportOptionCampaign {
  campaign_id: string
  campaign_name: string | null
  account_id: string | null
  ads_type: string | null
}

export interface AdsReportOptionsData {
  can_view_unscoped: boolean
  show_team_filter: boolean
  main_teams: AdsReportOptionMainTeam[]
  accounts: AdsReportOptionAccount[]
  teams: AdsReportOptionTeam[]
  campaigns: AdsReportOptionCampaign[]
}

export interface AdsReportOptionsResponse {
  data: AdsReportOptionsData
}
