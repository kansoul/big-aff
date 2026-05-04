<?php

namespace App\Actions\StyleReportRange;

use App\Models\Channel;
use App\Models\RevenueChartReport;
use App\Models\RevenueReport;
use App\Models\Style;
use App\Models\User;
use App\Support\OwnerResource\StyleOwnerResource;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class GetStyleReportRangeAction
{
    /**
     * @param  array{ranges: list<array{start_date: string, start_time: string, end_date: string, end_time: string, channel_codes: list<string>}>}  $filters
     * @return list<array<string, mixed>>
     */
    public function execute(array $filters): array
    {
        /** @var User $user */
        $user = Auth::user();

        $allowedChannelCodes = null;
        if (! $user->is_admin) {
            $styleSubquery = Style::query()->select('code');
            (new StyleOwnerResource)->applyTo($styleSubquery);

            $allowedChannelCodes = RevenueChartReport::whereIn('style_code', $styleSubquery)
                ->distinct()
                ->pluck('channel_code')
                ->all();
        }

        $data = [];

        foreach ($filters['ranges'] as $range) {
            $startDateTime = Carbon::parse("{$range['start_date']} {$range['start_time']}");
            $endDateTime = Carbon::parse("{$range['end_date']} {$range['end_time']}");
            $label = $startDateTime->toDateTimeString().' - '.$endDateTime->toDateTimeString();

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
                    $realRpc = $realConversion > 0 ? round($realRevenue / $realConversion, 6) : 0.0;
                } else {
                    $realRevenue = null;
                    $realConversion = null;
                    $realRpc = null;
                }

                $revenueReport = $revenueReports->get($channelCode);

                $data[] = [
                    'range_label' => $label,
                    'channel_code' => $channelCode,
                    'channel_name' => $channels->get($channelCode, $channelCode),
                    'revenue_start' => $revenueStart,
                    'revenue_end' => $revenueEnd,
                    'real_revenue' => $realRevenue,
                    'conversion_start' => $conversionStart,
                    'conversion_end' => $conversionEnd,
                    'real_conversion' => $realConversion,
                    'real_rpc' => $realRpc,
                    'cpc' => $revenueReport?->cost_per_click ?? 0.0,
                ];
            }
        }

        return $data;
    }
}
