import axios, { AxiosError } from 'axios'

import { apiURL } from '@/config'
import { useSessionStore } from '@/hooks/useSessionStore'

export const axiosInstance = axios.create({
  baseURL: apiURL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  withXSRFToken: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

axiosInstance.interceptors.request.use((config) => {
  const token = useSessionStore.getState().getActiveToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isHandlingUnauthorized = false

axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    const url = error.config?.url ?? ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/sanctum/csrf-cookie')

    if (error.response?.status === 401 && !isAuthEndpoint && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true
      window.dispatchEvent(new Event('unauthorized'))
      setTimeout(() => {
        isHandlingUnauthorized = false
      }, 3000)
    }
    return Promise.reject(error)
  },
)
