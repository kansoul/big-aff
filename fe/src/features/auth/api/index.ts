import type { LoginCredentials } from '../types/login'

import { apiURL } from '@/config'
import { axiosInstance } from '@/shared/api/axios'
import type { ApiResponse, User } from '@/shared/types'

export const loginApi = {
  async getMe(): Promise<User> {
    const response = await axiosInstance.get<ApiResponse<User>>('/auth/me')
    const user = response.data.data

    return {
      ...user,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      is_main_system: Boolean(user.is_main_system),
    }
  },

  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout')
  },

  async uploadAvatar(file: File): Promise<User> {
    const form = new FormData()
    form.append('avatar', file)
    const response = await axiosInstance.post<ApiResponse<User>>('/auth/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.data.data
  },

  async getCsrfCookie() {
    const baseURL = String(apiURL).replace(/\/api$/, '')
    return axiosInstance.get(`${baseURL}/sanctum/csrf-cookie`)
  },

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    await this.getCsrfCookie()
    const response = await axiosInstance.post<{ data: User; token: string }>(
      '/auth/login',
      credentials,
    )
    const u = response.data.data
    return {
      user: { ...u, permissions: Array.isArray(u.permissions) ? u.permissions : [] },
      token: response.data.token,
    }
  },

  async switchAccount(token: string): Promise<User> {
    await this.getCsrfCookie()
    const response = await axiosInstance.post<{ data: User }>('/auth/switch', { token })
    const u = response.data.data
    return { ...u, permissions: Array.isArray(u.permissions) ? u.permissions : [] }
  },
}
