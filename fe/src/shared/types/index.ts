export interface User {
  id: number
  name: string
  email: string
  permission_mask: number
  permissions: string[]
}

export interface Role {
  id: number
  name: string
  permission_mask: number
  permissions: string[]
  created_at: string | null
  updated_at: string | null
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  errors?: Record<string, string[]>
}
