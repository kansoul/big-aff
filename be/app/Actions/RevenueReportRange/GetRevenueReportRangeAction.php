<?php

namespace App\Actions\RevenueReportRange;

use App\Models\RevenueChartReport;
use App\Support\OwnershipFilter\OwnershipFilter;
use Carbon\Carbon;

class GetRevenueReportRangeAction
{
    /**
     * @param  array{ranges: list<array{start_date: string, start_time: string, end_date: string, end_time: string, channel_codes: list<string>}>}  $filters
     * @return list<array<string, mixed>>
     */
    public function execute(array $filters): array
    {
        $ownership = OwnershipFilter::forAuthUser();

        $data = [];

        foreach ($filters['ranges'] as $range) {
            $startDateTime = Carbon::parse("{$range['start_date']} {$range['start_time']}");
            $endDateTime = Carbon::parse("{$range['end_date']} {$range['end_time']}");
            $label = $startDateTime->toDateTimeString().' - '.$endDateTime->toDateTimeString();

            $channelCodes = $range['channel_codes'];

            if (empty($channelCodes)) {
                continue;
            }

            $startQuery = RevenueChartReport::query()->whereIn('channel_code', $channelCodes);
            $endQuery = RevenueChartReport::query()->whereIn('channel_code', $channelCodes);
            $ownership->applyTo($startQuery, 'owner_user_id');
            $ownership->applyTo($endQuery, 'owner_user_id');

            $startRecords = $startQuery
                ->whereBetween('datetime', [
                    $startDateTime->copy()->startOfMinute(),
                    $startDateTime->copy()->endOfMinute(),
                ])
                ->get()
                ->keyBy('channel_code');

            $endRecords = $endQuery
                ->whereBetween('datetime', [
                    $endDateTime->copy()->startOfMinute(),
                    $endDateTime->copy()->endOfMinute(),
                ])
                ->get()
                ->keyBy('channel_code');

            foreach ($channelCodes as $channelCode) {
                $startRecord = $startRecords->get($channelCode);
                $endRecord = $endRecords->get($channelCode);

                $revenueStart = $startRecord?->estimated_earnings;
                $revenueEnd = $endRecord?->estimated_earnings;
                $conversionStart = $startRecord?->clicks;
                $conversionEnd = $endRecord?->clicks;

                $hasData = ! is_null($revenueStart) && ! is_null($revenueEnd);

                if ($hasData) {
                    $realRevenue = $revenueEnd - $revenueStart;
                    $realConversion = $conversionEnd - $conversionStart;
                    // Revenue per conversion for the selected range.
                    $realRpc = $realConversion > 0 ? round($realRevenue / $realConversion, 4) : 0.0;
                } else {
                    $realRevenue = null;
                    $realConversion = null;
                    $realRpc = null;
                }

                $data[] = [
                    'range_label' => $label,
                    'channel_code' => $channelCode,
                    'revenue_start' => $revenueStart,
                    'revenue_end' => $revenueEnd,
                    'real_revenue' => $realRevenue !== null ? round($realRevenue, 4) : null,
                    'conversion_start' => $conversionStart,
                    'conversion_end' => $conversionEnd,
                    'real_conversion' => $realConversion,
                    'real_rpc' => $realRpc,
                    'cpc' => 0.0,
                ];
            }
        }

        return $data;
    }
}
