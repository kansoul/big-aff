import { loginApi } from '@/features/auth/api'
import { axiosInstance } from '@/shared/api/axios'

export interface TikTokOAuthExchangePayload {
  auth_code: string
  state?: string | null
}

export interface TikTokOAuthExchangeResult {
  success: boolean
  message: string
  data?: {
    token_id: number
    advertiser_ids: string[]
    expires_at: string | null
    refresh_token_expires_at: string | null
  }
}

export const tiktokOAuthApi = {
  async exchange(payload: TikTokOAuthExchangePayload): Promise<TikTokOAuthExchangeResult> {
    await loginApi.getCsrfCookie()
    const response = await axiosInstance.post<TikTokOAuthExchangeResult>(
      '/tiktok/oauth/exchange',
      payload,
    )
    return response.data
  },
}
