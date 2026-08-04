<?php

namespace App\Actions\RevenueReport;

use App\Models\RevenueReport;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListRevenueReportsAction
{
    /** @var array<int, string> */
    public const ORDERABLE_COLUMNS = [
        'id',
        'session_id',
        'campaign_id',
        'adset_id',
        'ad_id',
        'click_id',
        'estimate_earning',
        'page_views',
        'clicks',
        'ad_requests',
        'impressions',
        'ad_requests_rpm',
        'impressions_rpm',
        'cost_per_click',
        'funnel_requests',
        'funnel_impressions',
        'funnel_clicks',
        'funnel_rpm',
        'created_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     * @return array{paginator: LengthAwarePaginator, summary: array<string, mixed>}
     */
    public function execute(array $filters): array
    {
        $ownership = OwnershipFilter::forAuthUser();
        $query = RevenueReport::query();

        if (! $ownership->isAdmin()) {
            $query->whereHas('campaign', fn ($campaign) => $campaign->whereIn('created_by', $ownership->allowedUserIds()));
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (! empty($filters['campaign_ids'])) {
            $query->whereIn('campaign_id', $filters['campaign_ids']);
        }

        $summaryRow = (clone $query)->selectRaw('
            SUM(estimate_earning) as estimate_earning,
            SUM(page_views) as page_views,
            SUM(clicks) as clicks,
            SUM(ad_requests) as ad_requests,
            SUM(impressions) as impressions,
            SUM(funnel_requests) as funnel_requests,
            SUM(funnel_impressions) as funnel_impressions,
            SUM(funnel_clicks) as funnel_clicks
        ')->first();

        $summary = $summaryRow?->toArray() ?? [];
        $earning = (float) ($summary['estimate_earning'] ?? 0);
        $summary['estimate_earning'] = $earning;
        $summary['ad_requests_rpm'] = ($summary['ad_requests'] ?? 0) > 0
            ? round($earning / $summary['ad_requests'] * 1000, 4) : 0;
        $summary['impressions_rpm'] = ($summary['impressions'] ?? 0) > 0
            ? round($earning / $summary['impressions'] * 1000, 4) : 0;
        $summary['cost_per_click'] = ($summary['clicks'] ?? 0) > 0
            ? round($earning / $summary['clicks'], 4) : 0;
        $summary['funnel_rpm'] = ($summary['funnel_impressions'] ?? 0) > 0
            ? round($earning / $summary['funnel_impressions'] * 1000, 4) : 0;

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'created_at',
            defaultDirection: 'desc',
        )->applyTo($query);

        return [
            'paginator' => PaginationInput::fromValidatedArray($filters)->paginateQuery($query),
            'summary' => $summary,
        ];
    }
}
