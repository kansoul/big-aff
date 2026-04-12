export type CampaignRuleOrder = 'asc' | 'desc'
export type CampaignRuleOrderBy = 'id' | 'name' | 'email' | 'created_at'

export type CampaignRuleActionMode = 'pause' | 'warning'

export interface CampaignRuleSetting {
  id: number | string
  campaign_rule_auto_enabled: boolean
  action_mode: CampaignRuleActionMode
  telegram_chat_id: string | null
  updated_at: string | null
}

export interface CampaignRuleSettingsUser {
  id: number
  name: string
  email: string
  campaign_rule_setting: CampaignRuleSetting | null
}

export interface CampaignRuleSettingsPagination {
  current_page: number
  from: number | null
  to: number | null
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  total: number
}

export interface CampaignRuleSettingsListResponse {
  data: CampaignRuleSettingsUser[]
  pagination: CampaignRuleSettingsPagination
}

export interface CampaignRuleSettingsFilterParams {
  order?: CampaignRuleOrder | null
  order_by?: CampaignRuleOrderBy | null
  page?: number
  per_page?: number
}

export interface SaveCampaignRuleSettingPayload {
  campaign_rule_auto_enabled: boolean
  action_mode: CampaignRuleActionMode
  telegram_chat_id: string | null
}
