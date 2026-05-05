<?php

namespace App\Http\Resources\CampaignRule;

use App\Enums\EntityTypeEnum;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
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
            'entity_ids' => $this->whenLoaded('applyRules', fn () => $this->resolveEntityIdsForResponse()),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function resolveEntityIdsForResponse(): array
    {
        $type = $this->entity_type;

        if ($type === EntityTypeEnum::Campaign) {
            return $this->resolveSourceableExternalIds(Campaign::class, 'campaign_id');
        }

        return $this->applyRules
            ->whereIn('sourceable_type', [AdsInsightsReport::class, AdsetInsightsReport::class])
            ->pluck('sourceable_id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  class-string  $sourceableType
     * @return array<int, string>
     */
    private function resolveSourceableExternalIds(string $sourceableType, string $externalColumn): array
    {
        $numericIds = $this->applyRules
            ->where('sourceable_type', $sourceableType)
            ->pluck('sourceable_id')
            ->unique()
            ->values()
            ->all();

        if (empty($numericIds)) {
            return [];
        }

        return match ($sourceableType) {
            Campaign::class => Campaign::whereIn('campaign_id', $numericIds)->pluck($externalColumn)->values()->all(),
            default => [],
        };
    }
}
