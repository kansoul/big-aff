<?php

namespace App\Actions\RevenueReport;

use App\Models\RevenueReport;
use App\Support\OwnerResource\ChannelLinkedOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListRevenueReportsAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'date',
        'style_code',
        'channel_code',
        'page_views',
        'clicks',
        'estimated_earnings',
        'ad_requests',
        'impressions',
        'cost_per_click',
        'funnel_requests',
        'funnel_impressions',
        'funnel_clicks',
        'funnel_rpm',
        'created_at',
    ];

    /**
     * @param  array{date_from?: string|null, date_to?: string|null, style_codes?: string[]|null, channel_codes?: string[]|null, per_page?: int|null, page?: int|null, order_by?: string|null, order?: string|null}  $filters
     * @return array{paginator: LengthAwarePaginator, summary: array<string, mixed>}
     */
    public function execute(array $filters): array
    {
        $query = RevenueReport::query();

        (new ChannelLinkedOwnerResource)->applyTo($query);

        if (! empty($filters['date_from'])) {
            $query->whereDate('date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('date', '<=', $filters['date_to']);
        }

        if (! empty($filters['style_codes'])) {
            $query->whereIn('style_code', $filters['style_codes']);
        }

        if (! empty($filters['channel_codes'])) {
            $query->whereIn('channel_code', $filters['channel_codes']);
        }

        $summaryRow = (clone $query)->selectRaw('
            SUM(page_views) as page_views,
            SUM(clicks) as clicks,
            SUM(estimated_earnings) as estimated_earnings,
            SUM(ad_requests) as ad_requests,
            SUM(impressions) as impressions,
            SUM(funnel_requests) as funnel_requests,
            SUM(funnel_impressions) as funnel_impressions,
            SUM(funnel_clicks) as funnel_clicks
        ')->first();

        $summary = $summaryRow ? $summaryRow->toArray() : [];
        if ($summaryRow) {
            $summary['ad_requests_rpm'] = $summaryRow->ad_requests > 0
                ? round(($summaryRow->estimated_earnings / $summaryRow->ad_requests) * 1000, 2)
                : 0;
            $summary['impressions_rpm'] = $summaryRow->impressions > 0
                ? round(($summaryRow->estimated_earnings / $summaryRow->impressions) * 1000, 2)
                : 0;
            $summary['cost_per_click'] = $summaryRow->clicks > 0
                ? round($summaryRow->estimated_earnings / $summaryRow->clicks, 2)
                : 0;
            $summary['funnel_rpm'] = $summaryRow->funnel_impressions > 0
                ? round(($summaryRow->estimated_earnings / $summaryRow->funnel_impressions) * 1000, 2)
                : 0;
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'date',
            defaultDirection: 'desc',
        )->applyTo($query);

        $paginator = PaginationInput::fromValidatedArray($filters)->paginateQuery($query);

        return [
            'paginator' => $paginator,
            'summary' => $summary,
        ];
    }
}
