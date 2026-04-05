export interface User {
  id: number
  name: string
  email: string
  permissions: string[]
}

/** User row from `GET/POST/PUT /api/users` (admin UI). */
export interface ManagedUser {
  id: number
  name: string
  email: string
  role_id: number | null
  role: {
    id: number
    name: string
    permissions: string[]
  } | null
  parent_id: number | null
  parent: {
    id: number
    name: string
  } | null
  created_at: string | null
  updated_at: string | null
}

export interface Role {
  id: number
  name: string
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
