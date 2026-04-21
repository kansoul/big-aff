<?php

namespace App\Actions\RevenueChartReport;

use App\Models\Channel;
use App\Models\RevenueChartReport;
use App\Support\OwnershipFilter\OwnershipFilter;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class GetRevenueChartReportAction
{
    /**
     * @var array<int, string>
     */
    public const ALLOWED_METRICS = [
        'estimated_earnings',
        'clicks',
        'page_views',
        'impressions',
        'ad_requests',
        'cost_per_click',
        'ad_requests_rpm',
        'impressions_rpm',
        'funnel_requests',
        'funnel_impressions',
        'funnel_clicks',
        'funnel_rpm',
    ];

    /** Metrics that represent per-unit rates — use AVG instead of SUM when aggregating across styles. */
    private const RATE_METRICS = [
        'cost_per_click',
        'ad_requests_rpm',
        'impressions_rpm',
        'funnel_rpm',
    ];

    /**
     * @param  array{date_from?: string|null, date_to?: string|null, channel_codes?: string[]|null, metric?: string|null}  $filters
     * @return array{labels: list<string>, values: list<float>, stats: array{total: float, avg: float, max: float, min: float, count: int}}
     */
    public function execute(array $filters): array
    {
        $metric = $filters['metric'] ?? 'estimated_earnings';
        $startDate = Carbon::parse($filters['date_from'] ?? now()->startOfDay());
        $endDate = Carbon::parse($filters['date_to'] ?? now()->endOfDay())->endOfDay();

        $isRateMetric = in_array($metric, self::RATE_METRICS, true);
        $aggregateFn = $isRateMetric ? 'AVG' : 'SUM';

        $ownership = OwnershipFilter::forAuthUser();

        // Group by datetime so multiple styles at the same timestamp are aggregated into one point.
        $query = RevenueChartReport::query()
            ->select([
                'datetime',
                DB::raw("{$aggregateFn}(`{$metric}`) as metric_value"),
            ])
            ->whereBetween('datetime', [$startDate, $endDate])
            ->groupBy('datetime')
            ->orderBy('datetime');

        $ownership->applyThrough(
            $query,
            'channel_code',
            fn (array $ids) => Channel::whereIn('created_by', $ids)->select('code'),
        );

        if (! empty($filters['channel_codes'])) {
            $query->whereIn('channel_code', $filters['channel_codes']);
        }

        $data = $query->get();

        $diffInDays = $startDate->diffInDays($endDate);

        $labels = $data->pluck('datetime')->map(function ($datetime) use ($diffInDays) {
            $dt = Carbon::parse($datetime);

            return $diffInDays <= 1 ? $dt->format('H:i') : $dt->format('d/m H:i');
        })->values()->all();

        $values = $data->pluck('metric_value')->map(fn ($v) => round((float) $v, 6))->values()->all();

        $collection = collect($values);

        $stats = $collection->isEmpty()
            ? ['total' => 0.0, 'avg' => 0.0, 'max' => 0.0, 'min' => 0.0, 'count' => 0]
            : [
                'total' => round($collection->sum(), 6),
                'avg' => round($collection->avg(), 6),
                'max' => round($collection->max(), 6),
                'min' => round($collection->min(), 6),
                'count' => $collection->count(),
            ];

        return [
            'labels' => $labels,
            'values' => $values,
            'stats' => $stats,
        ];
    }
}
