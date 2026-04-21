<?php

namespace App\Actions\RevenueReport;

use App\Models\Channel;
use App\Models\RevenueReport;
use App\Support\OwnershipFilter\OwnershipFilter;
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
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = RevenueReport::query();

        $ownership->applyThrough($query, 'channel_code', fn (array $ids) => Channel::whereIn('created_by', $ids)->select('code'));

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

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'date',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}
