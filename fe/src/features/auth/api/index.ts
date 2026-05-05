import type { LoginCredentials } from '../types/login'

import { apiURL } from '@/config'
import { axiosInstance } from '@/shared/api/axios'
import type { User } from '@/shared/types'

export const loginApi = {
  async getCsrfCookie() {
    const baseURL = apiURL.replace(/\/api$/, '')
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
