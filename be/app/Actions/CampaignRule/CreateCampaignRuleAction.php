<?php

namespace App\Actions\CampaignRule;

use App\Enums\EntityTypeEnum;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
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
            $entityType = EntityTypeEnum::from($data['entity_type']);

            $entityIds = $this->normalizeEntityIdList($data['entity_ids'] ?? []);

            unset($data['entity_ids']);

            $rule = CampaignRule::create([
                ...$data,
                'user_id' => Auth::id(),
            ]);

            if ($entityType === EntityTypeEnum::Campaign) {
                $this->upsertApplyRules(
                    $rule->id,
                    Campaign::class,
                    $this->resolveCampaignSourceableIds($entityIds),
                );
            } elseif ($entityType === EntityTypeEnum::AdAdset) {
                $this->upsertAdAdsetApplyRules(
                    $rule->id,
                    AdAdsetApplyRuleTargets::resolve($entityIds),
                );
            }

            return $rule->load(['user', 'applyRules']);
        });
    }

    /**
     * @param  array<int, mixed>  $raw
     * @return list<string>
     */
    private function normalizeEntityIdList(array $raw): array
    {
        return array_values(array_unique(array_filter(array_map(
            static fn (mixed $v): string => is_string($v) ? trim($v) : (string) $v,
            $raw,
        ), static fn (string $v): bool => $v !== '')));
    }

    /**
     * @param  array<int, string>  $externalCampaignIds
     * @return array<int, int>
     */
    private function resolveCampaignSourceableIds(array $externalCampaignIds): array
    {
        if (empty($externalCampaignIds)) {
            return [];
        }

        return Campaign::whereIn('campaign_id', $externalCampaignIds)
            ->pluck('campaign_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @param  array<int, int>  $sourceableIds
     */
    private function upsertApplyRules(int $ruleId, string $sourceableType, array $sourceableIds): void
    {
        if (empty($sourceableIds)) {
            return;
        }

        $now = now();

        $rows = array_map(fn (int $id) => [
            'campaign_rule_id' => $ruleId,
            'sourceable_type' => $sourceableType,
            'sourceable_id' => $id,
            'created_at' => $now,
            'updated_at' => $now,
        ], $sourceableIds);

        CampaignApplyRule::upsert(
            $rows,
            ['sourceable_id', 'sourceable_type', 'campaign_rule_id'],
        );
    }

    /**
     * @param  list<array{type: class-string<AdsInsightsReport|AdsetInsightsReport>, sourceable_id: int}>  $targets
     */
    private function upsertAdAdsetApplyRules(int $ruleId, array $targets): void
    {
        if (empty($targets)) {
            return;
        }

        $now = now();

        $rows = array_map(fn (array $t) => [
            'campaign_rule_id' => $ruleId,
            'sourceable_type' => $t['type'],
            'sourceable_id' => $t['sourceable_id'],
            'created_at' => $now,
            'updated_at' => $now,
        ], $targets);

        CampaignApplyRule::upsert(
            $rows,
            ['sourceable_id', 'sourceable_type', 'campaign_rule_id'],
        );
    }
}
