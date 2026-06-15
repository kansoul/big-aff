<?php

namespace App\Actions\Tracking;

use App\Models\LinkData;
use App\Models\RevenueReport;
use Carbon\Carbon;

class ResolveAdsConversionRpcAction
{
    public function execute(?string $campaignId, mixed $conversionDateTime = null): ?float
    {
        if (! $campaignId) {
            return null;
        }

        $channelCode = LinkData::query()
            ->where('campaign_id', $campaignId)
            ->value('channel_code');

        if (! $channelCode) {
            return null;
        }

        $date = $this->resolveDate($conversionDateTime);

        $report = RevenueReport::query()
            ->whereDate('date', $date)
            ->where('channel_code', $channelCode)
            ->select([
                'date',
                'estimated_earnings',
                'clicks',
                'cost_per_click',
            ])
            ->first();

        if (! $report) {
            return null;
        }

        $costPerClick = (float) ($report->cost_per_click ?? 0);
        if ($costPerClick > 0) {
            return $costPerClick;
        }

        $clicks = (int) ($report->clicks ?? 0);
        $estimatedEarnings = (float) ($report->estimated_earnings ?? 0);

        if ($clicks > 0 && $estimatedEarnings > 0) {
            return $estimatedEarnings / $clicks;
        }

        return null;
    }

    private function resolveDate(mixed $conversionDateTime): string
    {
        if (! $conversionDateTime) {
            return now()->toDateString();
        }

        return Carbon::parse($conversionDateTime)->toDateString();
    }
}
