export interface DailyStats {
  today: number
  yesterday: number
}

export interface WeeklyStats {
  this_week: number
  last_week: number
}

export interface MonthlyStats {
  this_month: number
  last_month: number
}

export interface InsightStatsData {
  daily_spend: DailyStats
  weekly_spend: WeeklyStats
  monthly_spend: MonthlyStats
  daily_revenue: DailyStats
  weekly_revenue: WeeklyStats
  monthly_revenue: MonthlyStats
}

export interface InsightStatsResponse {
  data: InsightStatsData
}

export interface InsightStatsParams {
  month?: string
}

export interface RevenueStats {
  revenue: number
  spend: number
  profit: number
  roi: number
}

export interface RevenueTeamRow {
  team_id: number
  team_name: string
  daily: RevenueStats
  yesterday: RevenueStats
  monthly: RevenueStats
}

export interface RevenueTopUserRow {
  user_id: number
  user_name: string
  team_id: number
  team_name: string
  daily: RevenueStats
  yesterday: RevenueStats
  monthly: RevenueStats
}

export interface RevenueMainTeamRow {
  main_team_id: number
  main_team_name: string
  today: RevenueStats
  yesterday: RevenueStats
  this_month: RevenueStats
  last_month: RevenueStats
}

export interface RevenueTableData {
  by_team: RevenueTeamRow[]
  top_users: RevenueTopUserRow[]
  top_main_teams?: RevenueMainTeamRow[]
}

export interface RevenueTableParams {
  top_limit?: number
}

export interface RevenueTableResponse {
  data: RevenueTableData
}
