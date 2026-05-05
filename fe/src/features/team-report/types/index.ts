export interface TeamReportFilterParams {
  date_from?: string | null
  date_to?: string | null
  main_team_ids?: number[]
  team_ids?: number[]
  user_ids?: number[]
}

export interface TeamOverviewData {
  revenue: number
  spend: number
  profit: number
  roi: number
}

export interface TeamOverviewResponse {
  data: TeamOverviewData
}

export interface TeamReportByTeamRow {
  team_id: number
  team_name: string
  revenue: number
  spend: number
  profit: number
  roi: number
}

export interface TeamReportByTeamResponse {
  data: TeamReportByTeamRow[]
}

export interface TeamReportByUserRow {
  user_id: number
  user_name: string
  team_id: number
  team_name: string
  revenue: number
  spend: number
  profit: number
  roi: number
}

export interface TeamReportByUserResponse {
  data: TeamReportByUserRow[]
}
