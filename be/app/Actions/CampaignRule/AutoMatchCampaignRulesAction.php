<?php

namespace App\Actions\CampaignRule;

use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
        $scannedCount = 0;

        foreach ($campaigns as $campaign) {
            $scannedCount++;

            if (empty($campaign->campaign_name)) {
                Log::channel('rule_tracking')->debug('[RuleMatch][Campaign] Skipped: empty campaign_name', [
                    'campaign_id' => $campaign->campaign_id ?? null,
                ]);

                continue;
            }

            preg_match_all('/rule_([A-Z0-9]+)/i', (string) $campaign->campaign_name, $matches);

            if (empty($matches[0])) {
                Log::channel('rule_tracking')->debug('[RuleMatch][Campaign] No rule code found in name', [
                    'campaign_id' => $campaign->campaign_id,
                    'campaign_name' => $campaign->campaign_name,
                ]);

                continue;
            }

            $codes = array_unique($matches[0]);
            $campaignsWithCodes[(int) $campaign->campaign_id] = $codes;

            Log::channel('rule_tracking')->info('[RuleMatch][Campaign] Codes extracted from name', [
                'campaign_id' => $campaign->campaign_id,
                'campaign_name' => $campaign->campaign_name,
                'codes' => array_values($codes),
            ]);

            foreach ($codes as $code) {
                $allCodes[] = $code;
            }
        }

        Log::channel('rule_tracking')->info('[RuleMatch][Campaign] Scan finished', [
            'scanned_campaigns' => $scannedCount,
            'campaigns_with_codes' => count($campaignsWithCodes),
            'distinct_codes' => count(array_unique($allCodes)),
        ]);

        if (empty($allCodes)) {
            return;
        }

        $rules = CampaignRule::whereIn('code_rule', array_unique($allCodes))
            ->where('is_active', true)
            ->get();

        if ($rules->isEmpty()) {
            Log::channel('rule_tracking')->warning('[RuleMatch][Campaign] No active rule matches any extracted code', [
                'codes' => array_values(array_unique($allCodes)),
            ]);

            return;
        }

        $rulesByCode = [];
        foreach ($rules as $rule) {
            $rulesByCode[$rule->code_rule][] = $rule->id;
        }

        // Codes present in campaign names but not matched to any active rule (case-sensitive gap included).
        $unmatchedCodes = array_values(array_diff(array_unique($allCodes), array_keys($rulesByCode)));
        if (! empty($unmatchedCodes)) {
            Log::channel('rule_tracking')->warning('[RuleMatch][Campaign] Codes found in names but NOT matched to an active rule', [
                'unmatched_codes' => $unmatchedCodes,
                'matched_codes' => array_keys($rulesByCode),
            ]);
        }

        $records = [];
        $now = now();

        foreach ($campaignsWithCodes as $campaignId => $codes) {
            foreach ($codes as $code) {
                if (! isset($rulesByCode[$code])) {
                    Log::channel('rule_tracking')->warning('[RuleMatch][Campaign] Code did not resolve to a rule (skipped)', [
                        'campaign_id' => $campaignId,
                        'code' => $code,
                    ]);

                    continue;
                }

                foreach ($rulesByCode[$code] as $ruleId) {
                    Log::channel('rule_tracking')->info('[RuleMatch][Campaign] Matched code to rule', [
                        'campaign_id' => $campaignId,
                        'code' => $code,
                        'rule_id' => $ruleId,
                    ]);

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
            Log::channel('rule_tracking')->info('[RuleMatch][Campaign] No apply-rule records to upsert');

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

        Log::channel('rule_tracking')->info('[RuleMatch][Campaign] Apply-rule records upserted', [
            'records' => count($records),
        ]);
    }
}
