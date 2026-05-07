<?php

namespace App\Actions\CampaignRule;

use App\Enums\EntityTypeEnum;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use Illuminate\Support\Facades\DB;

class AutoMatchAdAdsetRulesAction
{
    /**
     * Scans ad/adset names for embedded rule codes (pattern: rule_[A-Z0-9]+)
     * and creates CampaignApplyRule entries for any matching CampaignRule.
     *
     * @param  iterable<AdsInsightsReport>  $ads
     * @param  iterable<AdsetInsightsReport>  $adsets
     */
    public function execute(iterable $ads, iterable $adsets): void
    {
        $entitiesWithCodes = [];
        $allCodes = [];

        foreach ($ads as $ad) {
            if (empty($ad->ad_name)) {
                continue;
            }

            preg_match_all('/rule_([A-Z0-9]+)/i', (string) $ad->ad_name, $matches);

            if (empty($matches[0])) {
                continue;
            }

            $codes = array_unique($matches[0]);
            $entitiesWithCodes[] = [
                'type' => AdsInsightsReport::class,
                'sourceable_id' => (int) $ad->ad_id,
                'codes' => $codes,
            ];

            foreach ($codes as $code) {
                $allCodes[] = $code;
            }
        }

        foreach ($adsets as $adset) {
            if (empty($adset->adset_name)) {
                continue;
            }

            preg_match_all('/rule_([A-Z0-9]+)/i', (string) $adset->adset_name, $matches);

            if (empty($matches[0])) {
                continue;
            }

            $codes = array_unique($matches[0]);
            $entitiesWithCodes[] = [
                'type' => AdsetInsightsReport::class,
                'sourceable_id' => (int) $adset->adset_id,
                'codes' => $codes,
            ];

            foreach ($codes as $code) {
                $allCodes[] = $code;
            }
        }

        if (empty($allCodes)) {
            return;
        }

        $rules = CampaignRule::whereIn('code_rule', array_unique($allCodes))
            ->where('entity_type', EntityTypeEnum::AdAdset->value)
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

        foreach ($entitiesWithCodes as $entity) {
            foreach ($entity['codes'] as $code) {
                if (! isset($rulesByCode[$code])) {
                    continue;
                }

                foreach ($rulesByCode[$code] as $ruleId) {
                    $records[] = [
                        'campaign_rule_id' => $ruleId,
                        'sourceable_type' => $entity['type'],
                        'sourceable_id' => $entity['sourceable_id'],
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
