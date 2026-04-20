<?php

namespace App\Actions\CampaignRule;

use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateCampaignRuleAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): CampaignRule
    {
        return DB::transaction(function () use ($data) {
            $campaignIds = $data['campaign_ids'] ?? [];
            unset($data['campaign_ids']);

            $rule = CampaignRule::create([
                ...$data,
                'user_id' => Auth::id(),
            ]);

            if (! empty($campaignIds)) {
                $applyRules = array_map(fn (int $id) => [
                    'campaign_rule_id' => $rule->id,
                    'sourceable_type' => Campaign::class,
                    'sourceable_id' => $id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ], $campaignIds);

                CampaignApplyRule::upsert(
                    $applyRules,
                    ['sourceable_id', 'sourceable_type', 'campaign_rule_id'],
                );
            }

            return $rule->load(['user', 'applyRules']);
        });
    }
}
