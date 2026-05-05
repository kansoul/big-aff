<?php

namespace App\Actions\CampaignRule;

use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use Illuminate\Support\Facades\DB;

class AutoMatchCampaignRulesAction
{
    /**
     * Scans campaign names for embedded rule codes (pattern: rule_[A-Z0-9]+)
     * and creates CampaignApplyRule entries for any matching CampaignRule.
     *
     * @param  iterable<Campaign>  $campaigns
     */
    public function execute(iterable $campaigns): void
    {
        $campaignsWithCodes = [];
        $allCodes = [];

        foreach ($campaigns as $campaign) {
            if (empty($campaign->campaign_name)) {
                continue;
            }

            preg_match_all('/rule_([A-Z0-9]+)/i', (string) $campaign->campaign_name, $matches);

            if (empty($matches[0])) {
                continue;
            }

            $codes = array_unique($matches[0]);
            $campaignsWithCodes[(int) $campaign->campaign_id] = $codes;

            foreach ($codes as $code) {
                $allCodes[] = $code;
            }
        }

        if (empty($allCodes)) {
            return;
        }

        $rules = CampaignRule::whereIn('code_rule', array_unique($allCodes))
            ->where('is_active', true)
            ->get();

        if ($rules->isEmpty()) {
            return;
        }

        $rulesByCode = [];
        foreach ($rules as $rule) {
            $rulesByCode[$rule->code_rule][] = $rule->id;
        }

        $records = [];
        $now = now();

        foreach ($campaignsWithCodes as $campaignId => $codes) {
            foreach ($codes as $code) {
                if (! isset($rulesByCode[$code])) {
                    continue;
                }

                foreach ($rulesByCode[$code] as $ruleId) {
                    $records[] = [
                        'campaign_rule_id' => $ruleId,
                        'sourceable_type' => Campaign::class,
                        'sourceable_id' => $campaignId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        if (empty($records)) {
            return;
        }

        usort($records, fn ($a, $b) => $a['sourceable_id'] <=> $b['sourceable_id']
            ?: $a['campaign_rule_id'] <=> $b['campaign_rule_id']);

        foreach (array_chunk($records, 500) as $chunk) {
            DB::transaction(function () use ($chunk) {
                CampaignApplyRule::upsert(
                    $chunk,
                    ['sourceable_id', 'sourceable_type', 'campaign_rule_id'],
                    ['updated_at'],
                );
            }, 3);
        }
    }
}
