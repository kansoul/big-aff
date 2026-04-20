<?php

namespace App\Http\Resources\CampaignRule;

use App\Models\Campaign;
use App\Models\CampaignRule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CampaignRule
 */
class CampaignRuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'code_rule' => $this->code_rule,
            'entity_type' => $this->entity_type,
            'is_active' => $this->is_active,
            'expired_at' => $this->expired_at?->toISOString(),

            // Campaign-level conditions
            'min_roi' => $this->min_roi,
            'min_profit' => $this->min_profit,
            'min_revenue' => $this->min_revenue,
            'min_spend' => $this->min_spend,

            // Ad/Adset-level conditions
            'max_cpa' => $this->max_cpa,
            'min_conversion' => $this->min_conversion,
            'min_spend_adset' => $this->min_spend_adset,

            // Time window
            'start_hour' => $this->start_hour,
            'end_hour' => $this->end_hour,

            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),

            'apply_rules_count' => $this->whenLoaded('applyRules', fn () => $this->applyRules->count()),
            'campaign_ids' => $this->whenLoaded('applyRules', fn () => $this->applyRules
                ->where('sourceable_type', Campaign::class)
                ->pluck('sourceable_id')
                ->values()
            ),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
