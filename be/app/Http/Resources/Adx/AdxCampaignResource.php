<?php

namespace App\Http\Resources\Adx;

use App\Models\AdxCampaign;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AdxCampaign
 */
class AdxCampaignResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'adx_account_id' => $this->adx_account_id,
            'source' => $this->source,
            'account_id' => $this->account?->account_id,
            'account' => $this->whenLoaded('account', fn () => [
                'id' => $this->account?->id,
                'account_id' => $this->account?->account_id,
                'account_name' => $this->account?->account_name,
            ]),
            'campaign_id' => $this->campaign_id,
            'campaign_name' => $this->campaign_name,
            'daily_budget' => $this->daily_budget,
            'lifetime_budget' => $this->lifetime_budget,
            'gam_custom_key' => $this->gam_custom_key,
            'gam_custom_key_id' => $this->gam_custom_key_id,
            'gam_custom_value' => $this->gam_custom_value,
            'gam_custom_value_id' => $this->gam_custom_value_id,
            'gam_targeting_ready' => filled($this->gam_custom_key_id) && filled($this->gam_custom_value_id),
            'status' => $this->status,
            'start_time' => $this->start_time,
            'stop_time' => $this->stop_time,
            'created_time' => $this->created_time,
            'updated_time' => $this->updated_time,
            'first_seen_at' => $this->first_seen_at,
            'last_seen_at' => $this->last_seen_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
