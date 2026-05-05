<?php

namespace App\Actions\AnalyticsTracking;

use App\Enums\EventAdLoadType;
use App\Enums\EventClickType;
use App\Enums\EventViewType;
use App\Models\EventAdLoad;
use App\Models\EventClick;
use App\Models\EventView;
use App\Models\LinkData;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Database\Eloquent\Builder;

class GetAnalyticsStatsAction
{
    public function execute(array $filters): array
    {
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        $adsLinkId = $filters['ads_link_id'] ?? null;
        $campaignId = $filters['campaign_id'] ?? null;

        $ownership = OwnershipFilter::forAuthUser();
        $linkDataIds = $this->buildLinkDataSubquery($ownership, $adsLinkId);

        $viewTotals = EventView::query()
            ->selectRaw('
                COALESCE(SUM(CASE WHEN type = ? THEN 1 ELSE 0 END), 0) AS search_views,
                COALESCE(SUM(CASE WHEN type = ? THEN 1 ELSE 0 END), 0) AS article_views
            ', [EventViewType::ViewSearch->value, EventViewType::ViewArticle->value])
            ->when($dateFrom, fn ($q) => $q->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('created_at', '<=', $dateTo))
            ->when($campaignId, fn ($q) => $q->where('campaign_id', $campaignId))
            ->when($linkDataIds, fn ($q) => $q->whereIn('link_data_id', $linkDataIds))
            ->first();

        $searchViews = (int) $viewTotals->search_views;
        $articleViews = (int) $viewTotals->article_views;

        $clickTotals = EventClick::query()
            ->selectRaw('
                COALESCE(SUM(CASE WHEN type = ? THEN 1 ELSE 0 END), 0) AS ad_clicks,
                COALESCE(SUM(CASE WHEN type = ? THEN 1 ELSE 0 END), 0) AS keyword_clicks
            ', [EventClickType::ClickAd->value, EventClickType::ClickKeyword->value])
            ->when($dateFrom, fn ($q) => $q->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('created_at', '<=', $dateTo))
            ->when($campaignId, fn ($q) => $q->where('campaign_id', $campaignId))
            ->when($linkDataIds, fn ($q) => $q->whereIn('link_data_id', $linkDataIds))
            ->first();

        $adClicks = (int) $clickTotals->ad_clicks;
        $keywordClicks = (int) $clickTotals->keyword_clicks;

        $loadTotals = EventAdLoad::query()
            ->selectRaw('
                COALESCE(SUM(CASE WHEN type = ? THEN 1 ELSE 0 END), 0) AS failed_search,
                COALESCE(SUM(CASE WHEN type = ? THEN 1 ELSE 0 END), 0) AS failed_article
            ', [EventAdLoadType::ErrorSearch->value, EventAdLoadType::ErrorArticle->value])
            ->when($dateFrom, fn ($q) => $q->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('created_at', '<=', $dateTo))
            ->when($campaignId, fn ($q) => $q->where('campaign_id', $campaignId))
            ->when($linkDataIds, fn ($q) => $q->whereIn('link_data_id', $linkDataIds))
            ->first();

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
                    'value' => $keywordClicks,
                    'ctr' => $articleViews > 0 ? round(($keywordClicks / $articleViews) * 100, 2) : 0,
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

    private function buildLinkDataSubquery(OwnershipFilter $ownership, ?int $adsLinkId): ?Builder
    {
        // Only needed when filtering by ads_link_id or restricting to non-admin ownership.
        // campaign_id is filtered directly on the event tables (they carry the column natively).
        if ($ownership->isAdmin() && ! $adsLinkId) {
            return null;
        }

        $query = LinkData::query();

        if (! $ownership->isAdmin()) {
            $ownership->applyThroughChannel($query);
        }

        $query->when($adsLinkId, fn ($q) => $q->where('ads_link_id', $adsLinkId));

        return $query->select('id');
    }
}
