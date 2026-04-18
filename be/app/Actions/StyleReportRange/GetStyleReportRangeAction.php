<?php

namespace App\Actions\StyleReportRange;

use App\Models\RevenueChartReport;
use App\Models\RevenueReport;
use App\Models\Style;
use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class GetStyleReportRangeAction
{
    /**
     * @param  array{ranges: list<array{start_date: string, start_time: string, end_date: string, end_time: string, style_codes: list<string>}>}  $filters
     * @return list<array<string, mixed>>
     */
    public function execute(array $filters): array
    {
        /** @var User $user */
        $user = Auth::user();
        $ownership = OwnershipFilter::forAuthUser();

        $allowedStyleCodes = null;
        if (! $user->isAdmin) {
            $allowedStyleCodes = Style::query()
                ->whereIn('created_by', $ownership->allowedUserIds())
                ->pluck('code')
                ->all();
        }

        $data = [];

        foreach ($filters['ranges'] as $range) {
            $startDateTime = Carbon::parse("{$range['start_date']} {$range['start_time']}");
            $endDateTime = Carbon::parse("{$range['end_date']} {$range['end_time']}");
            $label = $startDateTime->toDateTimeString() . ' - ' . $endDateTime->toDateTimeString();

            $styleCodes = $range['style_codes'];

            if ($allowedStyleCodes !== null) {
                $styleCodes = array_values(array_intersect($styleCodes, $allowedStyleCodes));
            }

            if (empty($styleCodes)) {
                continue;
            }

            $startRecords = RevenueChartReport::whereIn('style_code', $styleCodes)
                ->whereBetween('datetime', [
                    $startDateTime->copy()->startOfMinute(),
                    $startDateTime->copy()->endOfMinute(),
                ])
                ->get()
                ->keyBy('style_code');

            $endRecords = RevenueChartReport::whereIn('style_code', $styleCodes)
                ->whereBetween('datetime', [
                    $endDateTime->copy()->startOfMinute(),
                    $endDateTime->copy()->endOfMinute(),
                ])
                ->get()
                ->keyBy('style_code');

            $latestRevenueReportIds = RevenueReport::whereIn('style_code', $styleCodes)
                ->selectRaw('MAX(id) as id')
                ->groupBy('style_code')
                ->pluck('id');

            $revenueReports = RevenueReport::whereIn('id', $latestRevenueReportIds)
                ->get()
                ->keyBy('style_code');

            $styles = Style::whereIn('code', $styleCodes)->pluck('name', 'code');

            foreach ($styleCodes as $styleCode) {
                $startRecord = $startRecords->get($styleCode);
                $endRecord = $endRecords->get($styleCode);

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

                $revenueReport = $revenueReports->get($styleCode);

                $data[] = [
                    'range_label' => $label,
                    'style_code' => $styleCode,
                    'style_name' => $styles->get($styleCode, $styleCode),
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
