<?php

namespace App\Http\Resources\CampaignRuleSetting;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * User payload for Manage Campaign Rule Settings (includes campaignRuleSetting).
 *
 * @property int $id
 * @property string $name
 * @property string $email
 */
class UserCampaignRuleSettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'campaign_rule_setting' => $this->whenLoaded('campaignRuleSetting', function () {
                if ($this->campaignRuleSetting === null) {
                    return null;
                }

                return [
                    'id' => $this->campaignRuleSetting->id,
                    'campaign_rule_auto_enabled' => $this->campaignRuleSetting->campaign_rule_auto_enabled,
                    'action_mode' => $this->campaignRuleSetting->action_mode->value,
                    'telegram_chat_id' => $this->campaignRuleSetting->telegram_chat_id,
                    'updated_at' => $this->campaignRuleSetting->updated_at?->toIso8601String(),
                ];
            }),
        ];
    }
}
