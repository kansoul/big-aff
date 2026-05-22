<?php

namespace App\Actions\RevenueReportRange;

use App\Models\Channel;
use App\Models\RevenueChartReport;
use App\Models\RevenueReport;
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

        $allowedChannelCodes = null;
        if (! $ownership->isAdmin()) {
            $allowedChannelCodes = Channel::join('channel_user', 'channel_user.channel_id', '=', 'channels.id')
                ->whereIn('channel_user.user_id', $ownership->allowedUserIds())
                ->whereNull('channel_user.deleted_at')
                ->distinct()
                ->pluck('channels.code')
                ->all();
        }

        $data = [];

        foreach ($filters['ranges'] as $range) {
            $startDateTime = Carbon::parse("{$range['start_date']} {$range['start_time']}");
            $endDateTime = Carbon::parse("{$range['end_date']} {$range['end_time']}");
            $label = $startDateTime->toDateTimeString() . ' - ' . $endDateTime->toDateTimeString();

            $channelCodes = $range['channel_codes'];

            if ($allowedChannelCodes !== null) {
                $channelCodes = array_values(array_intersect($channelCodes, $allowedChannelCodes));
            }

            if (empty($channelCodes)) {
                continue;
            }

            $startRecords = RevenueChartReport::whereIn('channel_code', $channelCodes)
                ->whereBetween('datetime', [
                    $startDateTime->copy()->startOfMinute(),
                    $startDateTime->copy()->endOfMinute(),
                ])
                ->get()
                ->keyBy('channel_code');

            $endRecords = RevenueChartReport::whereIn('channel_code', $channelCodes)
                ->whereBetween('datetime', [
                    $endDateTime->copy()->startOfMinute(),
                    $endDateTime->copy()->endOfMinute(),
                ])
                ->get()
                ->keyBy('channel_code');

            $latestRevenueReportIds = RevenueReport::whereIn('channel_code', $channelCodes)
                ->selectRaw('MAX(id) as id')
                ->groupBy('channel_code')
                ->pluck('id');

            $revenueReports = RevenueReport::whereIn('id', $latestRevenueReportIds)
                ->get()
                ->keyBy('channel_code');

            $channels = Channel::whereIn('code', $channelCodes)->pluck('name', 'code');

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
                    // mirrors CampaignReport rpc: r_revenue / r_conversion when conversion > 0
                    $realRpc = $realConversion > 0 ? round($realRevenue / $realConversion, 4) : 0.0;
                } else {
                    $realRevenue = null;
                    $realConversion = null;
                    $realRpc = null;
                }

                $revenueReport = $revenueReports->get($channelCode);

                // matching ListRevenueReportsAction summary formula
                $reportEarnings = (float) ($revenueReport?->estimated_earnings ?? 0.0);
                $cpc = $revenueReport?->cost_per_click;
                if ($cpc === null) {
                    $reportClicks = (int) ($revenueReport?->clicks ?? 0);
                    // cpc = estimated_earnings / clicks from the latest daily report,
                    $cpc = $reportClicks > 0 ? round($reportEarnings / $reportClicks, 4) : 0.0;
                }

                $data[] = [
                    'range_label' => $label,
                    'channel_code' => $channelCode,
                    'channel_name' => $channels->get($channelCode, $channelCode),
                    'revenue_start' => $revenueStart,
                    'revenue_end' => $revenueEnd,
                    'real_revenue' => $realRevenue !== null ? round($realRevenue, 4) : null,
                    'conversion_start' => $conversionStart,
                    'conversion_end' => $conversionEnd,
                    'real_conversion' => $realConversion,
                    'real_rpc' => $realRpc,
                    'cpc' => $cpc,
                ];
            }
        }

        return $data;
    }
}
