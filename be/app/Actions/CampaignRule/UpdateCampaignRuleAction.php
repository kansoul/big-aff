<?php

namespace App\Actions\CampaignRule;

use App\Enums\EntityTypeEnum;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
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
            $previousEntityType = $rule->entity_type;
            $incomingEntityTypeRaw = $data['entity_type'] ?? null;

            $hasEntityIds = array_key_exists('entity_ids', $data);
            $entityIdsList = $this->normalizeEntityIdList($data['entity_ids'] ?? []);

            unset($data['entity_ids']);

            $rule->update($data);
            $rule->refresh();

            $entityType = $rule->entity_type;

            if ($incomingEntityTypeRaw !== null) {
                $incomingEntityType = EntityTypeEnum::from($incomingEntityTypeRaw);
                if ($incomingEntityType !== $previousEntityType) {
                    CampaignApplyRule::query()
                        ->where('campaign_rule_id', $rule->id)
                        ->delete();
                }
            }

            if ($hasEntityIds && $entityType === EntityTypeEnum::Campaign) {
                $this->syncApplyRules(
                    $rule->id,
                    Campaign::class,
                    $this->resolveCampaignSourceableIds($entityIdsList),
                );
            }

            if ($hasEntityIds && $entityType === EntityTypeEnum::AdAdset) {
                $this->replaceAdAdsetApplyRules(
                    $rule->id,
                    AdAdsetApplyRuleTargets::resolve($entityIdsList),
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

        return Campaign::whereIn('campaign_id', $externalCampaignIds)->pluck('id')->all();
    }

    /**
     * @param  array<int, int>  $sourceableIds
     */
    private function syncApplyRules(int $ruleId, string $sourceableType, array $sourceableIds): void
    {
        CampaignApplyRule::query()
            ->where('campaign_rule_id', $ruleId)
            ->where('sourceable_type', $sourceableType)
            ->delete();

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
    private function replaceAdAdsetApplyRules(int $ruleId, array $targets): void
    {
        CampaignApplyRule::query()
            ->where('campaign_rule_id', $ruleId)
            ->whereIn('sourceable_type', [AdsInsightsReport::class, AdsetInsightsReport::class])
            ->delete();

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
