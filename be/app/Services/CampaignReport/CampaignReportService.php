<?php

namespace App\Services\CampaignReport;

use App\Actions\CampaignReport\ListCampaignReportsAction;
use App\Models\CampaignReport;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class CampaignReportService
{
    /**
     * Columns that get SUM-aggregated into grand_summary / group_summary.
     *
     * @var array<int, string>
     */
    private const SUM_COLUMNS = [
        'daily_budget',
        'lifetime_budget',
        'r_search_views',
        'r_conversion',
        'r_revenue',
        'r_ad_requests',
        'r_impressions',
        'r_funnel_requests',
        'r_funnel_clicks',
        'r_funnel_impressions',
        'a_ad_clicks',
        'a_article_views',
        'a_search_views',
        'a_conversion',
        'a_spend',
        'a_impressions',
        'a_reach',
        'a_clicks',
    ];

    public function __construct(
        private readonly ListCampaignReportsAction $listCampaignReportsAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array{
     *     paginator: LengthAwarePaginator,
     *     grand_summary: array<string, mixed>,
     *     group_by: string|null,
     *     groups: array<int, array<string, mixed>>,
     * }
     */
    public function list(array $filters): array
    {
        $paginator = $this->listCampaignReportsAction->execute($filters);

        $grandSummary = $this->computeGrandSummary($filters);

        $groupBy = ! empty($filters['group_by']) ? $filters['group_by'] : null;
        $groups = $groupBy !== null
            ? $this->buildGroups($paginator->items(), $groupBy)
            : [];

        return [
            'paginator' => $paginator,
            'grand_summary' => $grandSummary,
            'group_by' => $groupBy,
            'groups' => $groups,
        ];
    }

    /**
     * Compute SUM aggregates across the full (unpaginated) filtered query.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function computeGrandSummary(array $filters): array
    {
        $baseQuery = $this->listCampaignReportsAction->buildBaseQuery($filters);

        $selectParts = ['COUNT(*) AS record_count'];
        foreach (self::SUM_COLUMNS as $col) {
            $selectParts[] = "COALESCE(SUM({$col}), 0) AS {$col}";
        }

        $row = $baseQuery->selectRaw(implode(', ', $selectParts))->first();

        return $this->normalizeSummaryRow($row);
    }

    /**
     * Group the current page items by the given column and compute per-group summary.
     *
     * @param  array<int, CampaignReport>  $items
     * @return array<int, array{
     *     group_key: string|int|null,
     *     group_label: string|null,
     *     record_count: int,
     *     group_summary: array<string, mixed>,
     *     items: array<int, CampaignReport>,
     * }>
     */
    private function buildGroups(array $items, string $groupBy): array
    {
        if ($items === []) {
            return [];
        }

        // Resolve user_id mapping if needed (one account_id → one "primary" user_id).
        $accountUserMap = [];
        $userNameMap = [];
        if ($groupBy === 'user_id') {
            $accountIds = array_unique(array_map(fn (CampaignReport $r) => $r->account_id, $items));
            $accountUserMap = $this->resolveAccountPrimaryUser($accountIds);
            $userIds = array_unique(array_values($accountUserMap));
            $userNameMap = User::query()
                ->whereIn('id', $userIds)
                ->pluck('name', 'id')
                ->all();
        }

        $buckets = [];

        foreach ($items as $row) {
            [$key, $label] = $this->resolveGroupKeyLabel($row, $groupBy, $accountUserMap, $userNameMap);
            $bucketId = $key === null ? '__null__' : (string) $key;

            if (! isset($buckets[$bucketId])) {
                $buckets[$bucketId] = [
                    'group_key' => $key,
                    'group_label' => $label,
                    'record_count' => 0,
                    'group_summary' => $this->emptySummary(),
                    'items' => [],
                ];
            }

            $buckets[$bucketId]['items'][] = $row;
            $buckets[$bucketId]['record_count']++;
            foreach (self::SUM_COLUMNS as $col) {
                $buckets[$bucketId]['group_summary'][$col] =
                    (float) $buckets[$bucketId]['group_summary'][$col] + (float) ($row->{$col} ?? 0);
            }
        }

        foreach ($buckets as &$bucket) {
            $bucket['group_summary'] = $this->finalizeSummary($bucket['group_summary'], $bucket['record_count']);
        }
        unset($bucket);

        return array_values($buckets);
    }

    /**
     * @param  array<int, string|int>  $accountIds
     * @return array<string, int> account_id => user_id (primary = min user_id per account)
     */
    private function resolveAccountPrimaryUser(array $accountIds): array
    {
        if ($accountIds === []) {
            return [];
        }

        $rows = DB::table('account_user')
            ->whereIn('account_id', $accountIds)
            ->orderBy('account_id')
            ->orderBy('user_id')
            ->select('account_id', 'user_id')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $key = (string) $row->account_id;
            if (! isset($map[$key])) {
                $map[$key] = (int) $row->user_id;
            }
        }

        return $map;
    }

    /**
     * @param  array<string, int>  $accountUserMap
     * @param  array<int, string>  $userNameMap
     * @return array{0: string|int|null, 1: string|null}
     */
    private function resolveGroupKeyLabel(
        CampaignReport $row,
        string $groupBy,
        array $accountUserMap,
        array $userNameMap,
    ): array {
        return match ($groupBy) {
            'channel_code' => [$row->channel_code, $row->channel_name ?: $row->channel_code],
            'style_code' => [$row->style_code, $row->style_name ?: $row->style_code],
            'account_id' => [$row->account_id, $row->account_name ?: (string) $row->account_id],
            'campaign_id' => [$row->campaign_id, $row->campaign_name ?: $row->campaign_id],
            'user_id' => (function () use ($row, $accountUserMap, $userNameMap): array {
                $accountKey = (string) $row->account_id;
                $userId = $accountUserMap[$accountKey] ?? null;
                $label = $userId !== null ? ($userNameMap[$userId] ?? (string) $userId) : '(Unassigned)';

                return [$userId, $label];
            })(),
            default => [null, null],
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function emptySummary(): array
    {
        $summary = ['record_count' => 0];
        foreach (self::SUM_COLUMNS as $col) {
            $summary[$col] = 0;
        }

        return $summary;
    }

    /**
     * Normalize SUM query row: cast to numeric + append derived profit/roi.
     *
     * @return array<string, mixed>
     */
    private function normalizeSummaryRow(?object $row): array
    {
        $summary = $this->emptySummary();

        if ($row === null) {
            return $this->finalizeSummary($summary, 0);
        }

        $summary['record_count'] = (int) ($row->record_count ?? 0);
        foreach (self::SUM_COLUMNS as $col) {
            $summary[$col] = (float) ($row->{$col} ?? 0);
        }

        return $this->finalizeSummary($summary, $summary['record_count']);
    }

    /**
     * Attach derived fields (profit, roi) to a summary map.
     *
     * @param  array<string, mixed>  $summary
     * @return array<string, mixed>
     */
    private function finalizeSummary(array $summary, int $recordCount): array
    {
        $revenue = (float) ($summary['r_revenue'] ?? 0);
        $spend = (float) ($summary['a_spend'] ?? 0);
        $profit = $revenue - $spend;
        $roi = $spend > 0 ? ($profit / $spend) * 100 : 0.0;

        $rConversion = (float) ($summary['r_conversion'] ?? 0);
        $rAdRequests = (float) ($summary['r_ad_requests'] ?? 0);
        $rImpressions = (float) ($summary['r_impressions'] ?? 0);
        $rFunnelImpressions = (float) ($summary['r_funnel_impressions'] ?? 0);

        $aClicks = (float) ($summary['a_clicks'] ?? 0);
        $aImpressions = (float) ($summary['a_impressions'] ?? 0);
        $aConversion = (float) ($summary['a_conversion'] ?? 0);
        $aReach = (float) ($summary['a_reach'] ?? 0);

        $summary['record_count'] = $recordCount;
        $summary['profit'] = round($profit, 2);
        $summary['roi'] = round($roi, 2);

        // Derived rollups (ratios) computed from summed components.
        $summary['r_rpc'] = $rConversion > 0 ? round($revenue / $rConversion, 4) : 0.0;
        $summary['r_cpa'] = $rConversion > 0 ? round($revenue / $rConversion, 4) : 0.0;
        $summary['r_ad_requests_rpm'] =
            $rAdRequests > 0 ? round(($revenue / $rAdRequests) * 1000, 4) : 0.0;
        $summary['r_impressions_rpm'] =
            $rImpressions > 0 ? round(($revenue / $rImpressions) * 1000, 4) : 0.0;
        $summary['r_funnel_rpm'] =
            $rFunnelImpressions > 0 ? round(($revenue / $rFunnelImpressions) * 1000, 4) : 0.0;

        $summary['a_cpc'] = $aClicks > 0 ? round($spend / $aClicks, 4) : 0.0;
        $summary['a_cpc_link'] = $aClicks > 0 ? round($spend / $aClicks, 4) : 0.0;
        $summary['a_cpm'] = $aImpressions > 0 ? round(($spend / $aImpressions) * 1000, 4) : 0.0;
        $summary['a_ctr'] = $aImpressions > 0 ? round(($aClicks / $aImpressions) * 100, 4) : 0.0;
        $summary['a_ctr_link'] = $aImpressions > 0 ? round(($aClicks / $aImpressions) * 100, 4) : 0.0;
        $summary['a_cpa'] = $aConversion > 0 ? round($spend / $aConversion, 4) : 0.0;
        $summary['a_frequency'] = $aReach > 0 ? round($aImpressions / $aReach, 4) : 0.0;

        return $summary;
    }
}
