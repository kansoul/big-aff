import { z } from 'zod'

export const ACCOUNT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'die', label: 'Die' },
] as const

/** Values accepted by the BE AdsType enum (facebook | google only) */
export type AdsTypeFilterValue = 'facebook' | 'google'
/** Full display type – includes 'unknown' for legacy data */
export type AccountAdsType = AdsTypeFilterValue | 'unknown'
export type AccountOrderBy =
  | 'id'
  | 'account_id'
  | 'account_name'
  | 'ads_type'
  | 'status'
  | 'created_at'
export type AccountOrder = 'asc' | 'desc'

export type AccountOptionForAssign = {
  id: number
  account_id: string
  account_name: string | null
}

export interface AccountBusinessCenter {
  id: number
  name: string
}

export interface AccountTeam {
  id: number
  name: string
}

export interface Account {
  id: number
  business_center_id: number | null
  business_center: AccountBusinessCenter | null
  main_team_id: number | null
  account_id: string
  account_name: string | null
  ads_type: AccountAdsType
  status: string | null
  is_special: boolean
  sync_to_mcc: boolean
  roas_enabled: boolean
  user_id: number | null
  created_by: number | null
  updated_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface AccountPagination {
  current_page: number
  from: number | null
  to: number | null
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  total: number
}

export interface AccountListResponse {
  data: Account[]
  pagination: AccountPagination
}

export interface AccountFilterParams {
  query?: string | null
  ads_type?: AdsTypeFilterValue | null
  business_center_id?: number | null
  status?: string | null
  order_by?: AccountOrderBy | null
  order?: AccountOrder | null
  page?: number
  per_page?: number
}

export const accountCreateSchema = z.object({
  ads_type: z.enum(['facebook', 'google'], {
    error: 'Ads type is required',
  }),
  business_center_id: z.number().int().nullable().optional(),
  main_team_id: z.number().int().nullable().optional(),
  user_id: z.number().int().nullable().optional(),
  status: z.string().max(50).nullable().optional(),
  is_special: z.boolean().nullable().optional(),
  sync_to_mcc: z.boolean().nullable().optional(),
  roas_enabled: z.boolean().nullable().optional(),
  lines: z.string().min(1, 'Lines is required'),
})

export const accountUpdateSchema = z.object({
  account_id: z.string().min(1, 'Account ID is required').max(255),
  account_name: z.string().max(255).nullable().optional(),
  ads_type: z.enum(['facebook', 'google'], {
    error: 'Ads type is required',
  }),
  business_center_id: z.number().int().nullable().optional(),
  main_team_id: z.number().int().nullable().optional(),
  user_id: z.number().int().nullable().optional(),
  status: z.string().max(50).nullable().optional(),
  is_special: z.boolean(),
  sync_to_mcc: z.boolean(),
  roas_enabled: z.boolean(),
})

export type AccountCreateFormValues = z.infer<typeof accountCreateSchema>
export type AccountUpdateFormValues = z.infer<typeof accountUpdateSchema>

export type AccountCreatePayload = {
  ads_type: AdsTypeFilterValue
  business_center_id?: number | null
  main_team_id?: number | null
  user_id?: number | null
  status?: string | null
  is_special?: boolean | null
  sync_to_mcc?: boolean | null
  roas_enabled?: boolean | null
  lines: string
}

export type AccountUpdatePayload = {
  account_id: string
  account_name?: string | null
  ads_type: AdsTypeFilterValue
  business_center_id?: number | null
  main_team_id?: number | null
  user_id?: number | null
  status?: string | null
  is_special: boolean
  sync_to_mcc: boolean
  roas_enabled: boolean
}

export type UserOrderBy =
  | 'id'
  | 'name'
  | 'email'
  | 'role_id'
  | 'status'
  | 'created_at'
  | 'updated_at'

export interface UserFilterParams {
  order: 'asc' | 'desc' | null
  order_by: UserOrderBy | null
}
