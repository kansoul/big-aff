import { z } from 'zod'

export const userCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  role_id: z.number().min(1, 'Select a role'),
  style_id: z.number().nullable().optional(),
})

export type UserCreateFormValues = z.infer<typeof userCreateSchema>

export const userUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email'),
  password: z.union([z.string().min(8, 'At least 8 characters'), z.literal('')]),
  role_id: z.number().min(1, 'Select a role'),
  style_id: z.number().nullable().optional(),
})

export type UserUpdateFormValues = z.infer<typeof userUpdateSchema>

export type UserCreatePayload = {
  name: string
  email: string
  password: string
  role_id: number
  style_id?: number | null
}

export type UserUpdatePayload = {
  name?: string
  email?: string
  password?: string
  role_id?: number
  style_id?: number | null
}

export interface UserPagination {
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

export interface UserListResponse {
  data: { data: import('@/shared/types').ManagedUser[]; pagination: UserPagination }
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
