<?php

namespace App\Actions\CampaignRule;

use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\DB;

class UpdateCampaignRuleAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(CampaignRule $rule, array $data): CampaignRule
    {
        OwnershipFilter::forAuthUser()->authorize($rule->user_id);

        return DB::transaction(function () use ($rule, $data) {
            $campaignIds = $data['campaign_ids'] ?? null;
            unset($data['campaign_ids']);

            $rule->update($data);

            if ($campaignIds !== null) {
                $rule->applyRules()
                    ->where('sourceable_type', Campaign::class)
                    ->delete();

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
            }

            return $rule->load(['user', 'applyRules']);
        });
    }
}
