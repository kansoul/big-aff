<?php

namespace App\Services\CampaignReport;

use App\Actions\CampaignReport\ListCampaignReportsAction;
use App\Models\CampaignReport;
use App\Models\RevenueReport;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class CampaignReportService
{
    /**
     * Columns that are SUM-aggregated into grand_summary / group_summary.
     *
     * @var array<int, string>
     */
    private const SUM_COLUMNS = [
        // Budget
        'daily_budget',
        'lifetime_budget',
        // Ads (a_*)
        'a_ad_clicks',
        'a_article_views',
        'a_search_views',
        'a_conversion',
        'a_spend',
        'a_impressions',
        'a_reach',
        'a_clicks',
    ];

    /**
     * Mapping from campaign_reports r_* alias → revenue_reports column name.
     * These values are denormalized copies; summing them from campaign_reports
     * double-counts when multiple campaigns share the same (channel_code, date_start).
     */
    private const REVENUE_REPORT_COLUMNS = [
        'r_search_views' => 'page_views',
        'r_conversion' => 'clicks',
        'r_revenue' => 'estimated_earnings',
        'r_ad_requests' => 'ad_requests',
        'r_impressions' => 'impressions',
        'r_funnel_requests' => 'funnel_requests',
        'r_funnel_clicks' => 'funnel_clicks',
        'r_funnel_impressions' => 'funnel_impressions',
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

    // ─── Grand summary ────────────────────────────────────────────────────────

    /**
     * Compute SUM aggregates across the full (unpaginated) filtered query.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function computeGrandSummary(array $filters): array
    {
        $baseQuery = $this->listCampaignReportsAction->buildBaseQuery($filters);

        $baseQuery
            ->leftJoin(
                DB::raw('(SELECT MAX(id) AS id, channel_code, date FROM revenue_reports WHERE deleted_at IS NULL GROUP BY channel_code, date) AS rv_gs_unique'),
                function ($join) {
                    $join->on('rv_gs_unique.channel_code', '=', 'campaign_reports.channel_code')
                        ->on('rv_gs_unique.date', '=', 'campaign_reports.date_start');
                },
            )
            ->leftJoin('revenue_reports as rv_gs', 'rv_gs.id', '=', 'rv_gs_unique.id')
            ->leftJoin('realtime_reports as rt_gs', 'rt_gs.id', '=', 'campaign_reports.realtime_report_id');

        $selectParts = ['COUNT(*) AS record_count'];

        foreach (self::SUM_COLUMNS as $col) {
            $selectParts[] = "COALESCE(SUM(campaign_reports.{$col}), 0) AS {$col}";
        }

        // revenue_est = SUM(click_keyword_count * cost_per_click) per campaign row.
        // No dedup needed: click_keyword_count is already per-campaign.
        $selectParts[] = 'COALESCE(SUM(COALESCE(rt_gs.click_keyword_count, 0) * COALESCE(rv_gs.cost_per_click, 0)), 0) AS revenue_est';

        // Realtime aggregates
        $selectParts[] = 'COALESCE(SUM(rt_gs.click_ad_count), 0) AS rt_click_ad_count';
        $selectParts[] = 'COALESCE(SUM(rt_gs.click_keyword_count), 0) AS rt_click_keyword_count';
        $selectParts[] = 'COALESCE(SUM(rt_gs.view_search_count), 0) AS rt_view_search_count';
        $selectParts[] = 'COALESCE(SUM(rt_gs.view_article_count), 0) AS rt_view_article_count';

        $row = $baseQuery->selectRaw(implode(', ', $selectParts))->first();

        // r_* and revenue must be queried separately from revenue_reports to avoid
        // double-counting when multiple campaigns share the same (channel_code, date_start).
        $revenueStats = $this->computeRevenueReportStats($filters);

        return $this->normalizeSummaryRow($row, $revenueStats);
    }

    /**
     * Sum all revenue_reports columns (estimated_earnings and r_* fields) for
     * the filtered channels/dates. Queries revenue_reports directly so each
     * (channel_code, date) row is counted exactly once regardless of how many
     * campaigns share that channel on the same date.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, float>
     */
    private function computeRevenueReportStats(array $filters): array
    {
        $revenueQuery = RevenueReport::query();

        if (! empty($filters['date_from'])) {
            $revenueQuery->whereDate('date', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $revenueQuery->whereDate('date', '<=', $filters['date_to']);
        }

        if (! empty($filters['channel_codes'])) {
            $revenueQuery->whereIn('channel_code', $filters['channel_codes']);
        } else {
            $channelCodes = $this->listCampaignReportsAction->buildBaseQuery($filters)
                ->select('campaign_reports.channel_code')
                ->distinct()
                ->pluck('channel_code')
                ->filter()
                ->values();

            if ($channelCodes->isEmpty()) {
                return $this->emptyRevenueStats();
            }

            $revenueQuery->whereIn('channel_code', $channelCodes);
        }

        $selectParts = ['COALESCE(SUM(estimated_earnings), 0) AS revenue'];
        foreach (self::REVENUE_REPORT_COLUMNS as $alias => $col) {
            $selectParts[] = "COALESCE(SUM({$col}), 0) AS {$alias}";
        }

        $row = $revenueQuery->selectRaw(implode(', ', $selectParts))->first();

        $stats = ['revenue' => (float) ($row->revenue ?? 0)];
        foreach (array_keys(self::REVENUE_REPORT_COLUMNS) as $alias) {
            $stats[$alias] = (float) ($row->{$alias} ?? 0);
        }

        return $stats;
    }

    /**
     * @return array<string, float>
     */
    private function emptyRevenueStats(): array
    {
        $stats = ['revenue' => 0.0];
        foreach (array_keys(self::REVENUE_REPORT_COLUMNS) as $alias) {
            $stats[$alias] = 0.0;
        }

        return $stats;
    }

    // ─── Group building ───────────────────────────────────────────────────────

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

        [$accountUserMap, $userNameMap] = $this->resolveUserMapsIfNeeded($items, $groupBy);

        $buckets = [];
        $bucketRevenuePairs = []; // tracks (channel_code, date_start) per bucket to avoid double-counting revenue

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
                $bucketRevenuePairs[$bucketId] = [];
            }

            $buckets[$bucketId]['items'][] = $row;
            $buckets[$bucketId]['record_count']++;

            $this->accumulateSumColumns($buckets[$bucketId]['group_summary'], $row);
            $this->accumulateRevenueEst($buckets[$bucketId]['group_summary'], $row);
            $this->accumulateChannelRevenue($buckets[$bucketId]['group_summary'], $bucketRevenuePairs[$bucketId], $row);
            $this->accumulateRealtimeColumns($buckets[$bucketId]['group_summary'], $row);
        }

        foreach ($buckets as &$bucket) {
            $bucket['group_summary'] = $this->finalizeSummary($bucket['group_summary'], $bucket['record_count']);
        }
        unset($bucket);

        return array_values($buckets);
    }

    /**
     * Accumulate SUM_COLUMNS from a single row into a summary array.
     *
     * @param  array<string, mixed>  $summary
     */
    private function accumulateSumColumns(array &$summary, CampaignReport $row): void
    {
        foreach (self::SUM_COLUMNS as $col) {
            $summary[$col] = (float) $summary[$col] + (float) ($row->{$col} ?? 0);
        }
    }

    /**
     * Accumulate revenue_est (realtime click_keyword_count * cost_per_click) from a single row.
     * No dedup needed — click_keyword_count is per-campaign.
     *
     * @param  array<string, mixed>  $summary
     */
    private function accumulateRevenueEst(array &$summary, CampaignReport $row): void
    {
        $clickKeywordCount = (float) ($row->realtimeReport?->click_keyword_count ?? 0);
        $rpc = (float) ($row->rpc ?? 0);
        $summary['revenue_est'] += $clickKeywordCount * $rpc;
    }

    /**
     * Accumulate channel revenue and r_* stats once per unique (channel_code, date_start) pair
     * to avoid double-counting when multiple campaigns share the same channel/date.
     *
     * @param  array<string, mixed>  $summary
     * @param  array<string, bool>  $seenPairs
     */
    private function accumulateChannelRevenue(array &$summary, array &$seenPairs, CampaignReport $row): void
    {
        $pairKey = ($row->channel_code ?? '').'_'.($row->date_start?->toDateString() ?? '');

        if (isset($seenPairs[$pairKey])) {
            return;
        }

        $seenPairs[$pairKey] = true;
        $summary['revenue'] += (float) ($row->r_estimated_earnings ?? 0);

        foreach (array_keys(self::REVENUE_REPORT_COLUMNS) as $alias) {
            $summary[$alias] += (float) ($row->{$alias} ?? 0);
        }
    }

    /**
     * Accumulate realtime report counts from a single row into a summary array.
     *
     * @param  array<string, mixed>  $summary
     */
    private function accumulateRealtimeColumns(array &$summary, CampaignReport $row): void
    {
        $rt = $row->realtimeReport;
        $summary['rt_click_ad_count'] += (float) ($rt?->click_ad_count ?? 0);
        $summary['rt_click_keyword_count'] += (float) ($rt?->click_keyword_count ?? 0);
        $summary['rt_view_search_count'] += (float) ($rt?->view_search_count ?? 0);
        $summary['rt_view_article_count'] += (float) ($rt?->view_article_count ?? 0);
    }

    // ─── User / account resolution ────────────────────────────────────────────

    /**
     * When grouping by user_id, resolve account→user and user→name maps.
     * Returns empty maps for other group-by values.
     *
     * @param  array<int, CampaignReport>  $items
     * @return array{array<string, int>, array<int, string>}
     */
    private function resolveUserMapsIfNeeded(array $items, string $groupBy): array
    {
        if ($groupBy !== 'user_id') {
            return [[], []];
        }

        $accountIds = array_unique(array_map(fn (CampaignReport $r) => $r->account_id, $items));
        $accountUserMap = $this->resolveAccountPrimaryUser($accountIds);

        $userIds = array_unique(array_values($accountUserMap));
        $userNameMap = User::query()
            ->whereIn('id', $userIds)
            ->pluck('name', 'id')
            ->all();

        return [$accountUserMap, $userNameMap];
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

    // ─── Summary helpers ──────────────────────────────────────────────────────

    /**
     * @return array<string, mixed>
     */
    private function emptySummary(): array
    {
        $summary = [
            'record_count' => 0,
            'revenue' => 0.0,
            'revenue_est' => 0.0,
            'roi_realtime' => 0.0,
            'rt_click_ad_count' => 0.0,
            'rt_click_keyword_count' => 0.0,
            'rt_view_search_count' => 0.0,
            'rt_view_article_count' => 0.0,
            'cvr' => 0.0,
            'rt_cpa' => 0.0,
            'rt_cvr' => 0.0,
            'rt_ctr_keyword' => 0.0,
            'rt_ctr_search' => 0.0,
        ];

        foreach (self::SUM_COLUMNS as $col) {
            $summary[$col] = 0.0;
        }

        foreach (array_keys(self::REVENUE_REPORT_COLUMNS) as $alias) {
            $summary[$alias] = 0.0;
        }

        return $summary;
    }

    /**
     * Cast a raw aggregate query row to a normalized summary array, then finalize.
     *
     * @param  array<string, float>  $revenueStats  Result of computeRevenueReportStats()
     * @return array<string, mixed>
     */
    private function normalizeSummaryRow(?object $row, array $revenueStats = []): array
    {
        $summary = $this->emptySummary();
        $summary['revenue'] = $revenueStats['revenue'] ?? 0.0;

        foreach (array_keys(self::REVENUE_REPORT_COLUMNS) as $alias) {
            $summary[$alias] = $revenueStats[$alias] ?? 0.0;
        }

        if ($row === null) {
            return $this->finalizeSummary($summary, 0);
        }

        $summary['record_count'] = (int) ($row->record_count ?? 0);

        foreach (self::SUM_COLUMNS as $col) {
            $summary[$col] = (float) ($row->{$col} ?? 0);
        }

        $summary['revenue_est'] = (float) ($row->revenue_est ?? 0);
        $summary['rt_click_ad_count'] = (float) ($row->rt_click_ad_count ?? 0);
        $summary['rt_click_keyword_count'] = (float) ($row->rt_click_keyword_count ?? 0);
        $summary['rt_view_search_count'] = (float) ($row->rt_view_search_count ?? 0);
        $summary['rt_view_article_count'] = (float) ($row->rt_view_article_count ?? 0);

        return $this->finalizeSummary($summary, $summary['record_count']);
    }

    /**
     * Attach all derived fields (profit, roi, ratios) to a completed summary map.
     *
     * @param  array<string, mixed>  $summary
     * @return array<string, mixed>
     */
    private function finalizeSummary(array $summary, int $recordCount): array
    {
        $revenue = (float) ($summary['revenue'] ?? 0);
        $revenueEst = (float) ($summary['revenue_est'] ?? 0);
        $spend = (float) ($summary['a_spend'] ?? 0);

        $profit = $revenue - $spend;
        $roi = $spend > 0 ? ($profit / $spend) * 100 : 0.0;
        $roiRealtime = $spend > 0 ? (($revenueEst - $spend) / $spend) * 100 : 0.0;

        $rtClickAdCount = (int) ($summary['rt_click_ad_count'] ?? 0);
        $rtClickKeywordCount = (int) ($summary['rt_click_keyword_count'] ?? 0);
        $rtViewSearchCount = (int) ($summary['rt_view_search_count'] ?? 0);
        $rFunnelRequests = (float) ($summary['r_funnel_requests'] ?? 0);

        $summary['record_count'] = $recordCount;
        $summary['revenue'] = round($revenue, 2);
        $summary['revenue_est'] = round($revenueEst, 2);
        $summary['profit'] = round($profit, 2);
        $summary['roi'] = round($roi, 2);
        $summary['roi_realtime'] = round($roiRealtime, 2);
        $summary['rt_click_ad_count'] = $rtClickAdCount;
        $summary['rt_click_keyword_count'] = $rtClickKeywordCount;
        $summary['rt_view_search_count'] = $rtViewSearchCount;
        $summary['rt_view_article_count'] = (int) ($summary['rt_view_article_count'] ?? 0);
        $summary['cvr'] = $rFunnelRequests > 0 ? round(((float) ($summary['r_conversion'] ?? 0) / $rFunnelRequests) * 100, 4) : 0.0;
        $summary['rt_cpa'] = $rtClickAdCount > 0 ? round($spend / $rtClickAdCount, 4) : 0.0;
        $summary['rt_cvr'] = $rFunnelRequests > 0 ? round(($rtClickAdCount / $rFunnelRequests) * 100, 4) : 0.0;
        $summary['rt_ctr_keyword'] = $rFunnelRequests > 0 ? round(($rtClickKeywordCount / $rFunnelRequests) * 100, 4) : 0.0;
        $summary['rt_ctr_search'] = $rtViewSearchCount > 0 ? round(($rtClickAdCount / $rtViewSearchCount) * 100, 4) : 0.0;

        $summary = array_merge($summary, $this->deriveRevenueRatios($summary, $revenue));
        $summary = array_merge($summary, $this->deriveAdsRatios($summary, $spend));

        return $summary;
    }

    /**
     * Compute revenue-side ratios (r_rpc, r_cpa, RPMs) from summed components.
     *
     * @param  array<string, mixed>  $summary
     * @return array<string, float>
     */
    private function deriveRevenueRatios(array $summary, float $revenue): array
    {
        $rConversion = (float) ($summary['r_conversion'] ?? 0);
        $rAdRequests = (float) ($summary['r_ad_requests'] ?? 0);
        $rImpressions = (float) ($summary['r_impressions'] ?? 0);
        $rFunnelImpressions = (float) ($summary['r_funnel_impressions'] ?? 0);

        return [
            'r_rpc' => $rConversion > 0 ? round($revenue / $rConversion, 4) : 0.0,
            'r_cpa' => $rConversion > 0 ? round($revenue / $rConversion, 4) : 0.0,
            'r_ad_requests_rpm' => $rAdRequests > 0 ? round(($revenue / $rAdRequests) * 1000, 4) : 0.0,
            'r_impressions_rpm' => $rImpressions > 0 ? round(($revenue / $rImpressions) * 1000, 4) : 0.0,
            'r_funnel_rpm' => $rFunnelImpressions > 0 ? round(($revenue / $rFunnelImpressions) * 1000, 4) : 0.0,
        ];
    }

    /**
     * Compute ads-side ratios (CPC, CPM, CTR, CPA, frequency) from summed components.
     *
     * @param  array<string, mixed>  $summary
     * @return array<string, float>
     */
    private function deriveAdsRatios(array $summary, float $spend): array
    {
        $aClicks = (float) ($summary['a_clicks'] ?? 0);
        $aImpressions = (float) ($summary['a_impressions'] ?? 0);
        $aConversion = (float) ($summary['a_conversion'] ?? 0);
        $aReach = (float) ($summary['a_reach'] ?? 0);

        return [
            'a_cpc' => $aClicks > 0 ? round($spend / $aClicks, 4) : 0.0,
            'a_cpc_link' => $aClicks > 0 ? round($spend / $aClicks, 4) : 0.0,
            'a_cpm' => $aImpressions > 0 ? round(($spend / $aImpressions) * 1000, 4) : 0.0,
            'a_ctr' => $aImpressions > 0 ? round(($aClicks / $aImpressions) * 100, 4) : 0.0,
            'a_ctr_link' => $aImpressions > 0 ? round(($aClicks / $aImpressions) * 100, 4) : 0.0,
            'a_cpa' => $aConversion > 0 ? round($spend / $aConversion, 4) : 0.0,
            'a_frequency' => $aReach > 0 ? round($aImpressions / $aReach, 4) : 0.0,
        ];
    }
}
