import axios, { AxiosError } from 'axios'

import { apiURL } from '@/config'

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
