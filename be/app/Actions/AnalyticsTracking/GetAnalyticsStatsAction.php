<?php

namespace App\Actions\AnalyticsTracking;

use App\Enums\EventAdLoadType;
use App\Models\Account;
use App\Models\Campaign;
use App\Models\EventAdLoad;
use App\Models\InsightReport;
use App\Models\LinkData;
use App\Support\OwnershipFilter\OwnershipFilter;

class GetAnalyticsStatsAction
{
    public function execute(array $filters): array
    {
        $ownership = OwnershipFilter::forAuthUser();

        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        $accountId = $filters['account_id'] ?? null;
        $campaignId = $filters['campaign_id'] ?? null;

        // Resolve campaign_ids for event_ad_loads when account filter is present
        $campaignIdsForAccount = null;
        if ($accountId !== null) {
            $campaignIdsForAccount = Campaign::where('account_id', $accountId)
                ->pluck('campaign_id')
                ->toArray();
        }

        // ── InsightReport stats (views + clicks) ─────────────────────────────
        $insightQuery = InsightReport::query();
        $ownership->applyThrough($insightQuery, 'account_id', fn (array $ids) => Account::whereIn('created_by', $ids)->select('account_id'));

        $insightQuery
            ->when($dateFrom, fn ($q) => $q->whereDate('date_start', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('date_start', '<=', $dateTo))
            ->when($accountId, fn ($q) => $q->where('account_id', $accountId))
            ->when($campaignId, fn ($q) => $q->where('campaign_id', $campaignId));

        $totals = (clone $insightQuery)->selectRaw('
            COALESCE(SUM(search_views), 0)   AS total_search_views,
            COALESCE(SUM(article_views), 0)  AS total_article_views,
            COALESCE(SUM(ad_clicks), 0)      AS total_ad_clicks,
            COALESCE(SUM(search_clicks), 0)  AS total_search_clicks
        ')->first();

        $searchViews = (int) $totals->total_search_views;
        $articleViews = (int) $totals->total_article_views;
        $adClicks = (int) $totals->total_ad_clicks;
        $searchClicks = (int) $totals->total_search_clicks;

        // ── EventAdLoad stats (failed ad loads) ───────────────────────────────
        $loadQuery = EventAdLoad::query()
            ->whereIn('type', [EventAdLoadType::ErrorSearch, EventAdLoadType::ErrorArticle]);

        $ownership->applyThrough(
            $loadQuery,
            'link_data_id',
            fn (array $ids) => LinkData::join('ads_links', 'link_datas.ads_link_id', '=', 'ads_links.id')
                ->whereIn('ads_links.created_by', $ids)
                ->select('link_datas.id')
        );

        $loadQuery
            ->when($dateFrom, fn ($q) => $q->where('created_at', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('created_at', '<=', $dateTo))
            ->when($campaignId, fn ($q) => $q->where('campaign_id', $campaignId))
            ->when($campaignIdsForAccount !== null, fn ($q) => $q->whereIn('campaign_id', $campaignIdsForAccount));

        $loadTotals = (clone $loadQuery)->selectRaw('
            COALESCE(SUM(CASE WHEN type = ? THEN 1 ELSE 0 END), 0) AS failed_search,
            COALESCE(SUM(CASE WHEN type = ? THEN 1 ELSE 0 END), 0) AS failed_article
        ', [EventAdLoadType::ErrorSearch->value, EventAdLoadType::ErrorArticle->value])->first();

        $failedSearch = (int) $loadTotals->failed_search;
        $failedArticle = (int) $loadTotals->failed_article;

        return [
            'views' => [
                'search_views' => [
                    'value' => $searchViews,
                    'ctr' => $articleViews > 0 ? round(($searchViews / $articleViews) * 100, 2) : 0,
                ],
                'article_views' => [
                    'value' => $articleViews,
                ],
            ],
            'clicks' => [
                'search_ad_clicks' => [
                    'value' => $adClicks,
                    'ctr' => $searchViews > 0 ? round(($adClicks / $searchViews) * 100, 2) : 0,
                    'ctr_ldp' => $articleViews > 0 ? round(($adClicks / $articleViews) * 100, 2) : 0,
                ],
                'article_ad_clicks' => [
                    'value' => $searchClicks,
                    'ctr' => $articleViews > 0 ? round(($searchClicks / $articleViews) * 100, 2) : 0,
                ],
            ],
            'loads' => [
                'failed_search_ad_loads' => [
                    'value' => $failedSearch,
                    'ctr' => $searchViews > 0 ? round(($failedSearch / $searchViews) * 100, 2) : 0,
                ],
                'failed_article_ad_loads' => [
                    'value' => $failedArticle,
                    'ctr' => $articleViews > 0 ? round(($failedArticle / $articleViews) * 100, 2) : 0,
                ],
            ],
        ];
    }
}
