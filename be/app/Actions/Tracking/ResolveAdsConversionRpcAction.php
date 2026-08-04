<?php

namespace App\Actions\Tracking;

use App\Models\RevenueReport;
use Carbon\Carbon;

class ResolveAdsConversionRpcAction
{
    public function execute(?string $campaignId, mixed $conversionDateTime = null): ?float
    {
        if (! $campaignId) {
            return null;
        }

        $date = $this->resolveDate($conversionDateTime);

        $averageEarning = RevenueReport::query()
            ->where('campaign_id', $campaignId)
            ->whereDate('created_at', $date)
            ->avg('estimate_earning');

        return $averageEarning !== null ? (float) $averageEarning : null;
    }

    private function resolveDate(mixed $conversionDateTime): string
    {
        if (! $conversionDateTime) {
            return now()->toDateString();
        }

        return Carbon::parse($conversionDateTime)->toDateString();
    }
}
