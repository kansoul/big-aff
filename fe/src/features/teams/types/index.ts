import { z } from 'zod'

export type TeamOrderBy = 'id' | 'name' | 'created_at'
export type TeamOrder = 'asc' | 'desc'
export type TeamRole = 'manager' | 'leader' | 'member'

export interface Team {
  id: number
  name: string
  description: string | null
  users_count?: number
  users?: TeamUserOption[]
  created_by: number | null
  updated_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface TeamPagination {
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

export interface TeamListResponse {
  data: Team[]
  pagination: TeamPagination
}

export interface TeamFilterParams {
  query?: string | null
  order_by?: TeamOrderBy | null
  order?: TeamOrder | null
  page?: number
  per_page?: number
}

export const teamCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullable().optional(),
})

export type TeamCreateFormValues = z.infer<typeof teamCreateSchema>

export const teamUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullable().optional(),
})

export type TeamUpdateFormValues = z.infer<typeof teamUpdateSchema>

export interface TeamUserOption {
  id: number
  name: string
  email: string
}

export interface TeamUserOptionsResponse {
  data: TeamUserOption[]
  selected_ids: number[]
}

export type TeamCreatePayload = {
  name: string
  description?: string | null
}

export type TeamUpdatePayload = {
  name?: string
  description?: string | null
}

export type TeamAssignUsersPayload = {
  user_ids: number[]
  team_role: TeamRole | null
}
