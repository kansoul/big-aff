export interface RevenueReportFilterParams {
  date_from?: string | null
  date_to?: string | null
  team_ids?: number[]
  user_ids?: number[]
}

export interface RevenueOverviewData {
  revenue: number
  spend: number
  profit: number
  roi: number
}

export interface RevenueOverviewResponse {
  data: RevenueOverviewData
}

export interface RevenueByTeamRow {
  team_id: number
  team_name: string
  revenue: number
  spend: number
  profit: number
  roi: number
}

export interface RevenueByTeamResponse {
  data: RevenueByTeamRow[]
}

export interface RevenueByUserRow {
  user_id: number
  user_name: string
  team_id: number
  team_name: string
  revenue: number
  spend: number
  profit: number
  roi: number
}

export interface RevenueByUserResponse {
  data: RevenueByUserRow[]
}
