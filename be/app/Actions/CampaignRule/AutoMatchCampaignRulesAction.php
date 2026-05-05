<?php

namespace App\Actions\CampaignRule;

use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;

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
        foreach ($campaigns as $campaign) {
            $this->matchCampaign($campaign);
        }
    }

    private function matchCampaign(Campaign $campaign): void
    {
        preg_match_all('/rule_([A-Z0-9]+)/i', (string) $campaign->campaign_name, $matches);

        if (empty($matches[0])) {
            return;
        }

        $codes = $matches[0];

        $rules = CampaignRule::whereIn('code_rule', $codes)
            ->where('is_active', true)
            ->get();

        foreach ($rules as $rule) {
            CampaignApplyRule::firstOrCreate([
                'campaign_rule_id' => $rule->id,
                'sourceable_type' => Campaign::class,
                'sourceable_id' => $campaign->id,
            ]);
        }
    }
}
