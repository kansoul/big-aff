import type { LoginCredentials } from '../types/login'

import { apiURL } from '@/config'
import { axiosInstance } from '@/shared/api/axios'
import type { ApiResponse, User } from '@/shared/types'

export const loginApi = {
  async getCsrfCookie() {
    const baseURL = apiURL.replace(/\/api$/, '')
    return axiosInstance.get(`${baseURL}/sanctum/csrf-cookie`)
  },

  async login(credentials: LoginCredentials): Promise<User> {
    await this.getCsrfCookie()
    const response = await axiosInstance.post<ApiResponse<User>>('/auth/login', credentials)
    const u = response.data.data
    return {
      ...u,
      permission_mask: u.permission_mask ?? 0,
      permissions: u.permissions ?? [],
    }
  },
}
