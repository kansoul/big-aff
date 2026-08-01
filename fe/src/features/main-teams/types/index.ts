import { z } from 'zod'

export type MainTeamOrderBy = 'id' | 'name' | 'created_at'
export type MainTeamOrder = 'asc' | 'desc'

export interface MainTeamAccount {
  id: number
  account_id: string
  account_name: string | null
  ads_type: string
  status: string | null
}

export interface MainTeam {
  id: number
  name: string
  description: string | null
  sync_campaign_reports: boolean
  accounts_count?: number
  accounts?: MainTeamAccount[]
  created_at: string | null
  updated_at: string | null
}

export interface MainTeamPagination {
  current_page: number
  from: number | null
  to: number | null
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string | null
  per_page: number
  prev_page_url: string | null
  total: number
}

export interface MainTeamListResponse {
  data: MainTeam[]
  pagination: MainTeamPagination
}

export interface MainTeamFilterParams {
  query?: string | null
  order_by?: MainTeamOrderBy | null
  order?: MainTeamOrder | null
  page?: number
  per_page?: number
}

export const mainTeamFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullable().optional(),
  sync_campaign_reports: z.boolean(),
  account_ids_text: z.string().optional(),
})

export type MainTeamFormValues = z.infer<typeof mainTeamFormSchema>

export type MainTeamCreatePayload = {
  name: string
  description?: string | null
  sync_campaign_reports?: boolean
  account_ids?: string[]
}

export type MainTeamUpdatePayload = Partial<MainTeamCreatePayload>
