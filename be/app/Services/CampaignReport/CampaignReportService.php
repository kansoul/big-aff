<?php

namespace App\Services\CampaignReport;

use App\Actions\CampaignReport\ListCampaignReportsAction;
use App\Models\CampaignReport;
use App\Models\RevenueReport;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
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
            ? $this->sortGroups(
                $this->buildGroups($paginator->items(), $groupBy, $this->computeGroupSummaries($filters, $groupBy)),
                $filters,
            )
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

        // revenue_est = SUM(click_keyword_count * r_rpc) per campaign row.
        // No dedup needed: click_keyword_count is already per-campaign.
        // r_rpc is pre-computed at sync time (with fallback when cost_per_click is null).
        $selectParts[] = 'COALESCE(SUM(COALESCE(rt_gs.click_ad_count, 0) * IF(NULLIF(campaign_reports.r_rpc, 0) IS NOT NULL, campaign_reports.r_rpc, IF(NULLIF(campaign_reports.r_conversion, 0) IS NOT NULL, campaign_reports.r_revenue / campaign_reports.r_conversion, 0))), 0) AS revenue_est';

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

        $channelCodes = collect($filters['channel_codes'] ?? [])->filter()->unique()->values();
        if ($channelCodes->isEmpty()) {
            $channelCodes = $this->listCampaignReportsAction->buildBaseQuery($filters)
                ->select('campaign_reports.channel_code')
                ->distinct()
                ->pluck('channel_code')
                ->filter()
                ->values();

            if ($channelCodes->isEmpty()) {
                return $this->emptyRevenueStats();
            }
        }

        $revenueQuery->whereIn('channel_code', $channelCodes);

        $selectParts = ['COALESCE(SUM(estimated_earnings), 0) AS revenue'];
        foreach (self::REVENUE_REPORT_COLUMNS as $alias => $col) {
            $selectParts[] = "COALESCE(SUM({$col}), 0) AS {$alias}";
        }

        $row = $revenueQuery->selectRaw(implode(', ', $selectParts))->first();

        $stats = ['revenue' => (float) ($row->revenue ?? 0)];
        foreach (array_keys(self::REVENUE_REPORT_COLUMNS) as $alias) {
            $stats[$alias] = (float) ($row->{$alias} ?? 0);
        }

        $stats['r_conversion'] = $this->sumRevenueClicksWithRealtimeFallback($filters, $stats['r_conversion'] ?? 0.0);

        return $stats;
    }

    /**
     * Google may suppress low daily click counts. For each filtered channel/date,
     * use Google clicks when present; otherwise use that day's realtime clicks.
     */
    private function sumRevenueClicksWithRealtimeFallback(array $filters, float $defaultGoogleClicks): float
    {
        $pairsQuery = $this->listCampaignReportsAction->buildBaseQuery($filters)
            ->selectRaw('campaign_reports.channel_code, DATE(campaign_reports.date_start) AS report_date')
            ->whereNotNull('campaign_reports.channel_code')
            ->distinct();

        $googleClicksQuery = RevenueReport::query()
            ->selectRaw('channel_code, date AS rev_date, COALESCE(SUM(clicks), 0) AS google_clicks')
            ->groupBy('channel_code', 'date');

        $realtimeClicksQuery = DB::table('realtime_reports')
            ->join('link_datas', 'link_datas.id', '=', 'realtime_reports.link_data_id')
            ->whereNull('link_datas.deleted_at')
            ->selectRaw('link_datas.channel_code, realtime_reports.event_time AS rt_date, COALESCE(SUM(realtime_reports.click_ad_count), 0) AS realtime_clicks')
            ->groupBy('link_datas.channel_code', 'realtime_reports.event_time');

        if (! empty($filters['date_from'])) {
            $googleClicksQuery->whereDate('date', '>=', $filters['date_from']);
            $realtimeClicksQuery->whereDate('realtime_reports.event_time', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $googleClicksQuery->whereDate('date', '<=', $filters['date_to']);
            $realtimeClicksQuery->whereDate('realtime_reports.event_time', '<=', $filters['date_to']);
        }

        if (! empty($filters['channel_codes'])) {
            $googleClicksQuery->whereIn('channel_code', $filters['channel_codes']);
            $realtimeClicksQuery->whereIn('link_datas.channel_code', $filters['channel_codes']);
        }

        $row = DB::query()
            ->fromSub($pairsQuery, 'pairs')
            ->leftJoinSub($googleClicksQuery, 'google_clicks', function ($join) {
                $join->on('google_clicks.channel_code', '=', 'pairs.channel_code')
                    ->on('google_clicks.rev_date', '=', 'pairs.report_date');
            })
            ->leftJoinSub($realtimeClicksQuery, 'realtime_clicks', function ($join) {
                $join->on('realtime_clicks.channel_code', '=', 'pairs.channel_code')
                    ->on('realtime_clicks.rt_date', '=', 'pairs.report_date');
            })
            ->selectRaw('
                COUNT(*) AS pair_count,
                COALESCE(SUM(
                    CASE
                        WHEN COALESCE(google_clicks.google_clicks, 0) > 0
                            THEN google_clicks.google_clicks
                        ELSE COALESCE(realtime_clicks.realtime_clicks, 0)
                    END
                ), 0) AS clicks
            ')
            ->first();

        return (int) ($row->pair_count ?? 0) > 0
            ? (float) ($row->clicks ?? 0)
            : $defaultGoogleClicks;
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
     * Compute full (unpaginated) aggregate summaries for each group value.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, array<string, mixed>> keyed by (string) group_key
     */
    private function computeGroupSummaries(array $filters, string $groupBy): array
    {
        $sumRows = $this->buildGroupSumRows($filters, $groupBy);
        $revenueRows = $this->buildGroupRevenueRows($filters, $groupBy);

        $summaries = [];
        foreach ($sumRows as $key => $row) {
            $revenueStats = $revenueRows[$key] ?? $this->emptyRevenueStats();
            $summaries[$key] = $this->normalizeSummaryRow($row, $revenueStats);
        }

        return $summaries;
    }

    /**
     * Resolve the SQL expression for the group key column and apply any required joins.
     * Returns null for unsupported group-by values.
     */
    private function applyGroupKeyJoin(Builder $query, string $groupBy): ?string
    {
        if ($groupBy === 'user_id') {
            $query->leftJoin(
                DB::raw('(SELECT accounts.account_id AS string_account_id, MIN(account_user.user_id) AS primary_user_id FROM account_user JOIN accounts ON accounts.id = account_user.account_id JOIN users ON users.id = account_user.user_id WHERE users.role_id != 1 GROUP BY accounts.account_id) AS pu_grp'),
                'pu_grp.string_account_id',
                '=',
                'campaign_reports.account_id',
            );

            return 'pu_grp.primary_user_id';
        }

        return match ($groupBy) {
            'channel_code' => 'campaign_reports.channel_code',
            'style_code' => 'campaign_reports.style_code',
            'account_id' => 'campaign_reports.account_id',
            'campaign_id' => 'campaign_reports.campaign_id',
            default => null,
        };
    }

    /**
     * Run a GROUP BY aggregate query for SUM_COLUMNS + revenue_est + realtime counts.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, object> keyed by (string) group_key
     */
    private function buildGroupSumRows(array $filters, string $groupBy): array
    {
        $query = $this->listCampaignReportsAction->buildBaseQuery($filters);
        $query->leftJoin('realtime_reports AS rt_grp', 'rt_grp.id', '=', 'campaign_reports.realtime_report_id');

        $groupKeyExpr = $this->applyGroupKeyJoin($query, $groupBy);
        if ($groupKeyExpr === null) {
            return [];
        }

        $selectParts = [
            "{$groupKeyExpr} AS group_key",
            'COUNT(*) AS record_count',
        ];

        foreach (self::SUM_COLUMNS as $col) {
            $selectParts[] = "COALESCE(SUM(campaign_reports.{$col}), 0) AS {$col}";
        }

        $selectParts[] = 'COALESCE(SUM(COALESCE(rt_grp.click_ad_count, 0) * IF(NULLIF(campaign_reports.r_rpc, 0) IS NOT NULL, campaign_reports.r_rpc, IF(NULLIF(campaign_reports.r_conversion, 0) IS NOT NULL, campaign_reports.r_revenue / campaign_reports.r_conversion, 0))), 0) AS revenue_est';
        $selectParts[] = 'COALESCE(SUM(rt_grp.click_ad_count), 0) AS rt_click_ad_count';
        $selectParts[] = 'COALESCE(SUM(rt_grp.click_keyword_count), 0) AS rt_click_keyword_count';
        $selectParts[] = 'COALESCE(SUM(rt_grp.view_search_count), 0) AS rt_view_search_count';
        $selectParts[] = 'COALESCE(SUM(rt_grp.view_article_count), 0) AS rt_view_article_count';

        $rows = $query
            ->selectRaw(implode(', ', $selectParts))
            ->groupBy($groupKeyExpr)
            ->get();

        $result = [];
        foreach ($rows as $row) {
            $key = (string) ($row->group_key ?? '__null__');
            $result[$key] = $row;
        }

        return $result;
    }

    /**
     * Aggregate revenue_reports stats per group, counting each (channel_code, date_start)
     * pair exactly once to avoid double-counting when multiple campaigns share a channel/date.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, array<string, float>> keyed by (string) group_key
     */
    private function buildGroupRevenueRows(array $filters, string $groupBy): array
    {
        $query = $this->listCampaignReportsAction->buildBaseQuery($filters);

        $groupKeyExpr = $this->applyGroupKeyJoin($query, $groupBy);
        if ($groupKeyExpr === null) {
            return [];
        }

        $pairs = $query
            ->selectRaw("{$groupKeyExpr} AS group_key, campaign_reports.channel_code, DATE(campaign_reports.date_start) AS date_start")
            ->whereNotNull('campaign_reports.channel_code')
            ->distinct()
            ->get();

        if ($pairs->isEmpty()) {
            return [];
        }

        $channelCodes = $pairs->pluck('channel_code')->unique()->filter()->values();
        $dates = $pairs->pluck('date_start')->unique()->filter()->values();

        $revenueSelectParts = ['channel_code', 'date AS rev_date', 'COALESCE(SUM(estimated_earnings), 0) AS revenue'];
        foreach (self::REVENUE_REPORT_COLUMNS as $alias => $col) {
            $revenueSelectParts[] = "COALESCE(SUM({$col}), 0) AS {$alias}";
        }

        $revenueByPair = RevenueReport::query()
            ->whereIn('channel_code', $channelCodes)
            ->whereIn('date', $dates)
            ->selectRaw(implode(', ', $revenueSelectParts))
            ->groupBy('channel_code', 'date')
            ->get()
            ->keyBy(fn ($r) => $r->channel_code.'|'.substr((string) ($r->rev_date ?? ''), 0, 10));

        $result = [];
        foreach ($pairs as $pair) {
            $dateStart = $pair->date_start instanceof Carbon
                ? $pair->date_start->toDateString()
                : substr((string) ($pair->date_start ?? ''), 0, 10);
            $pairKey = ($pair->channel_code ?? '').'|'.$dateStart;
            $groupKey = (string) ($pair->group_key ?? '__null__');

            if (! isset($result[$groupKey])) {
                $result[$groupKey] = $this->emptyRevenueStats();
            }

            $revenue = $revenueByPair->get($pairKey);
            if ($revenue === null) {
                continue;
            }

            $result[$groupKey]['revenue'] += (float) $revenue->revenue;
            foreach (array_keys(self::REVENUE_REPORT_COLUMNS) as $alias) {
                $result[$groupKey][$alias] += (float) ($revenue->{$alias} ?? 0);
            }
        }

        return $result;
    }

    /**
     * Group the current page items by the given column, attaching pre-computed full summaries.
     *
     * @param  array<int, CampaignReport>  $items
     * @param  array<string, array<string, mixed>>  $groupSummaries  keyed by (string) group_key
     * @return array<int, array{
     *     group_key: string|int|null,
     *     group_label: string|null,
     *     record_count: int,
     *     group_summary: array<string, mixed>,
     *     items: array<int, CampaignReport>,
     * }>
     */
    private function buildGroups(array $items, string $groupBy, array $groupSummaries): array
    {
        if ($items === []) {
            return [];
        }

        [$accountUserMap, $userNameMap] = $this->resolveUserMapsIfNeeded($items, $groupBy);

        $buckets = [];

        foreach ($items as $row) {
            [$key, $label] = $this->resolveGroupKeyLabel($row, $groupBy, $accountUserMap, $userNameMap);
            $bucketId = $key === null ? '__null__' : (string) $key;

            if (! isset($buckets[$bucketId])) {
                $summary = $groupSummaries[$bucketId] ?? $this->finalizeSummary($this->emptySummary(), 0);
                $buckets[$bucketId] = [
                    'group_key' => $key,
                    'group_label' => $label,
                    'record_count' => $summary['record_count'] ?? 0,
                    'group_summary' => $summary,
                    'items' => [],
                ];
            }

            $buckets[$bucketId]['items'][] = $row;
        }

        return array_values($buckets);
    }

    /**
     * Sort groups by group_summary and items within each group by the row value for the same column.
     * Group order uses aggregated summaries which may differ from per-row SQL ORDER BY.
     *
     * @param  array<int, array<string, mixed>>  $groups
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    private function sortGroups(array $groups, array $filters): array
    {
        $orderBy = $filters['order_by'] ?? null;

        if ($orderBy === null) {
            return $groups;
        }

        $direction = $this->groupSortDirection($filters);

        foreach ($groups as &$group) {
            $items = $group['items'] ?? [];
            if (count($items) > 1) {
                usort(
                    $items,
                    fn (CampaignReport $a, CampaignReport $b) => $this->compareForSort(
                        $this->sortValueForCampaignReport($a, $orderBy),
                        $this->sortValueForCampaignReport($b, $orderBy),
                        $direction,
                    ),
                );
                $group['items'] = $items;
            }
        }
        unset($group);

        if (count($groups) <= 1) {
            return $groups;
        }

        usort(
            $groups,
            fn (array $a, array $b) => $this->compareForSort(
                $a['group_summary'][$orderBy] ?? null,
                $b['group_summary'][$orderBy] ?? null,
                $direction,
            ),
        );

        return $groups;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function groupSortDirection(array $filters): int
    {
        return strtolower((string) ($filters['order'] ?? 'desc')) === 'asc' ? 1 : -1;
    }

    private function sortValueForCampaignReport(CampaignReport $row, string $orderBy): mixed
    {
        $value = $row->getAttribute($orderBy);

        if ($value === null && $orderBy === 'r_cpa') {
            $rConversion = (float) ($row->r_conversion ?? 0);

            return $rConversion > 0
                ? ((float) ($row->a_spend ?? 0)) / $rConversion
                : 0.0;
        }

        return $value;
    }

    private function compareForSort(mixed $left, mixed $right, int $direction): int
    {
        if (is_numeric($left) && is_numeric($right)) {
            return ((float) $left <=> (float) $right) * $direction;
        }

        return strcmp((string) $left, (string) $right) * $direction;
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
     * @param  array<int, string>  $accountIds  String account_id values from campaign_reports (e.g. "act_xxx")
     * @return array<string, int> string account_id => user_id (primary = min user_id per account)
     */
    private function resolveAccountPrimaryUser(array $accountIds): array
    {
        if ($accountIds === []) {
            return [];
        }

        $rows = DB::table('account_user')
            ->join('accounts', 'accounts.id', '=', 'account_user.account_id')
            ->join('users', 'users.id', '=', 'account_user.user_id')
            ->whereIn('accounts.account_id', $accountIds)
            ->orderBy('accounts.account_id')
            ->orderBy('account_user.user_id')
            ->select('accounts.account_id as string_account_id', 'account_user.user_id')
            ->get();
        $map = [];
        foreach ($rows as $row) {
            $key = (string) $row->string_account_id;
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
                // info([$accountKey, $accountUserMap]);
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
            'ctr_keyword' => 0.0,
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
        $rFunnelImpressions = (float) ($summary['r_funnel_impressions'] ?? 0);
        $summary['cvr'] = $rFunnelRequests > 0 ? round(((float) ($summary['r_conversion'] ?? 0) / $rFunnelRequests) * 100, 4) : 0.0;
        $summary['ctr_keyword'] = $rFunnelRequests > 0 ? round(($rFunnelImpressions / $rFunnelRequests) * 100, 4) : 0.0;
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
        $spend = (float) ($summary['a_spend'] ?? 0);

        $rpcDivisor = $rConversion > 0 ? $rConversion : (float) ($summary['rt_click_ad_count'] ?? 0);

        return [
            'r_rpc' => $rpcDivisor > 0 ? round($revenue / $rpcDivisor, 4) : 0.0,
            'r_cpa' => $rConversion > 0 ? round($spend / $rConversion, 4) : 0.0,
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
