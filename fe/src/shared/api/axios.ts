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

axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('unauthorized'))
    }
    return Promise.reject(error)
  },
)
