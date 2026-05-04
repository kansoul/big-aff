<?php

namespace App\Actions\AnalyticsTracking;

use App\Enums\EventClickType;
use App\Models\EventClick;
use App\Models\LinkData;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ListKeywordTrackingAction
{
    public const array ORDERABLE_COLUMNS = ['keyword', 'click_count', 'click_ad_count'];

    public function execute(array $filters): LengthAwarePaginator
    {
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        $adsLinkId = $filters['ads_link_id'] ?? null;
        $campaignId = $filters['campaign_id'] ?? null;

        $ownership = OwnershipFilter::forAuthUser();
        $linkDataIds = $this->buildLinkDataSubquery($ownership, $adsLinkId);

        /** @var Builder<EventClick> $query */
        $query = EventClick::query()
            ->select([
                DB::raw('MIN(id) as id'),
                DB::raw('keyword_clicked as keyword'),
                DB::raw('COUNT(*) as click_count'),
                DB::raw("SUM(CASE WHEN type = '" . EventClickType::ClickAd->value . "' THEN 1 ELSE 0 END) AS click_ad_count"),
            ])
            ->whereNotNull('keyword_clicked')
            ->when($dateFrom, fn($q) => $q->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo, fn($q) => $q->whereDate('created_at', '<=', $dateTo))
            ->when($campaignId, fn($q) => $q->where('campaign_id', $campaignId))
            ->when($linkDataIds, fn($q) => $q->whereIn('link_data_id', $linkDataIds))
            ->when(
                ! empty($filters['keyword']),
                fn($q) => $q->where('keyword_clicked', 'like', '%' . $filters['keyword'] . '%')
            )
            ->groupBy('keyword_clicked');

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'click_count',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }

    private function buildLinkDataSubquery(OwnershipFilter $ownership, ?int $adsLinkId): ?Builder
    {
        if ($ownership->isAdmin() && ! $adsLinkId) {
            return null;
        }

        $query = LinkData::query();

        if (! $ownership->isAdmin()) {
            $ownership->applyThroughChannel($query);
        }

        $query->when($adsLinkId, fn($q) => $q->where('ads_link_id', $adsLinkId));

        return $query->select('id');
    }
}
