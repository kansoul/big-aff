<?php

namespace App\Actions\RevenueChartReport;

use App\Models\RevenueChartReport;
use App\Models\Style;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ListRevenueChartReportsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'datetime', 'style_code', 'style_name', 'created_at'];

    /**
     * @param  array{date_from?: string|null, date_to?: string|null, interval?: string|null, style_codes?: string[]|null, per_page?: int|null, page?: int|null, order_by?: string|null, order?: string|null}  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $styleCodes = $filters['style_codes'] ?? [];

        if (empty($styleCodes)) {
            return RevenueChartReport::query()->whereRaw('1 = 0')->paginate(1);
        }

        $ownership = OwnershipFilter::forAuthUser();

        $query = RevenueChartReport::query()
            ->addSelect([
                DB::raw('revenue_chart_reports.*'),
                DB::raw('estimated_earnings - COALESCE(LAG(estimated_earnings) OVER (PARTITION BY style_code, DATE(datetime) ORDER BY datetime), 0) as real_earnings'),
                DB::raw('clicks - COALESCE(LAG(clicks) OVER (PARTITION BY style_code, DATE(datetime) ORDER BY datetime), 0) as real_clicks'),
                DB::raw('page_views - COALESCE(LAG(page_views) OVER (PARTITION BY style_code, DATE(datetime) ORDER BY datetime), 0) as real_page_views'),
                DB::raw('ad_requests - COALESCE(LAG(ad_requests) OVER (PARTITION BY style_code, DATE(datetime) ORDER BY datetime), 0) as real_ad_requests'),
                DB::raw('impressions - COALESCE(LAG(impressions) OVER (PARTITION BY style_code, DATE(datetime) ORDER BY datetime), 0) as real_impressions'),
                DB::raw('funnel_requests - COALESCE(LAG(funnel_requests) OVER (PARTITION BY style_code, DATE(datetime) ORDER BY datetime), 0) as real_funnel_requests'),
                DB::raw('funnel_impressions - COALESCE(LAG(funnel_impressions) OVER (PARTITION BY style_code, DATE(datetime) ORDER BY datetime), 0) as real_funnel_impressions'),
                DB::raw('funnel_clicks - COALESCE(LAG(funnel_clicks) OVER (PARTITION BY style_code, DATE(datetime) ORDER BY datetime), 0) as real_funnel_clicks'),
            ]);

        $ownership->applyThrough(
            $query,
            'style_code',
            fn(array $ids) => Style::whereIn('created_by', $ids)->select('code'),
        );

        if (! empty($filters['date_from'])) {
            $query->where('datetime', '>=', Carbon::parse($filters['date_from'])->startOfDay());
        }

        if (! empty($filters['date_to'])) {
            $query->where('datetime', '<=', Carbon::parse($filters['date_to'])->endOfDay());
        }

        $query->whereIn('style_code', $styleCodes);

        $this->applyIntervalFilter($query, $filters['interval'] ?? '1');

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'datetime',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }

    private function applyIntervalFilter(Builder $query, string $interval): void
    {
        match ($interval) {
            '5m' => $query->whereRaw('MINUTE(datetime) % 5 = 0'),
            '15m' => $query->whereRaw('MINUTE(datetime) % 15 = 0'),
            '30m' => $query->whereRaw('MINUTE(datetime) % 30 = 0'),
            default => $this->applyHourlyInterval($query, $interval),
        };
    }

    private function applyHourlyInterval(Builder $query, string $interval): void
    {
        $query->whereRaw('MINUTE(datetime) = 0');

        $hours = (int) $interval;
        if ($hours > 1) {
            $query->whereRaw('HOUR(datetime) % ? = 0', [$hours]);
        }
    }
}
