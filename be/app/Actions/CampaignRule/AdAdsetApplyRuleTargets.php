<?php

namespace App\Actions\CampaignRule;

use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;

/**
 * Resolves mixed Ad / Adset provider IDs into polymorphic apply-rule rows,
 * mirroring tracking-afs {@see ManageCampaignRules::syncAdAdset()}.
 */
final class AdAdsetApplyRuleTargets
{
    /**
     * @param  list<string|int>  $rawIds
     * @return list<array{type: class-string<AdsInsightsReport|AdsetInsightsReport>, sourceable_id: int}>
     */
    public static function resolve(array $rawIds): array
    {
        $rows = [];
        $seen = [];

        foreach ($rawIds as $raw) {
            $id = is_string($raw) ? trim($raw) : (string) $raw;

            if ($id === '') {
                continue;
            }

            if (AdsInsightsReport::query()->where('ad_id', $id)->exists()) {
                $row = [
                    'type' => AdsInsightsReport::class,
                    'sourceable_id' => self::toNumericSourceableId($id),
                ];
                $key = $row['type'].'|'.$row['sourceable_id'];
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $rows[] = $row;

                continue;
            }

            if (AdsetInsightsReport::query()->where('adset_id', $id)->exists()) {
                $row = [
                    'type' => AdsetInsightsReport::class,
                    'sourceable_id' => self::toNumericSourceableId($id),
                ];
                $key = $row['type'].'|'.$row['sourceable_id'];
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $rows[] = $row;
            }
        }

        return $rows;
    }

    private static function toNumericSourceableId(string $sourceId): int
    {
        return (int) $sourceId;
    }
}
