import { axiosInstance } from '@/shared/api/axios'
import type {
  CampaignRuleSettingsFilterParams,
  CampaignRuleSettingsListResponse,
  CampaignRuleSettingsUser,
  SaveCampaignRuleSettingPayload,
} from '@/features/campaign-rule-settings/types'

export const campaignRuleSettingsApi = {
  list: (filters: CampaignRuleSettingsFilterParams) =>
    axiosInstance.get<CampaignRuleSettingsListResponse>('/campaign-rule-settings', {
      params: {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 10,
        ...(filters.order_by ? { order_by: filters.order_by } : {}),
        ...(filters.order ? { order: filters.order } : {}),
      },
    }),

  save: (userId: number, payload: SaveCampaignRuleSettingPayload) =>
    axiosInstance.put<{ data: CampaignRuleSettingsUser }>(`/campaign-rule-settings/${userId}`, {
      campaign_rule_auto_enabled: payload.campaign_rule_auto_enabled,
      action_mode: payload.action_mode,
      telegram_chat_id: payload.telegram_chat_id,
    }),
}
