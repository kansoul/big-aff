<?php

namespace App\Actions\AdsDeliveryEntities;

use App\Enums\AdsType;
use App\Models\AdsInsightsReport;
use App\Support\AdsDelivery\DeliveryInsightsReportFilters;
use App\Support\MainTeam\MainTeamReportDataScope;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use Illuminate\Support\Collection;

class GetAdsOnlyDeliveryEntitiesAction
{
    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, AdsInsightsReport>
     */
    public function execute(string $campaignId, array $filters): Collection
    {
        $query = AdsInsightsReport::query()
            ->addSelect([
                'ads_insights_reports.*',
                'conversion_realtime' => AdsInsightsReport::conversionRealtimeSubquery(),
                'rpc_est' => AdsInsightsReport::rpcEstSubquery(),
            ])
            ->where('campaign_id', $campaignId)
            ->orderByDesc('date_start')
            ->orderBy('ad_name');

        (new AccountLinkedOwnerResource)->applyTo($query);

        if (config('main_system.is_main')) {
            MainTeamReportDataScope::excludeNonFetchableAccounts(
                $query,
                'ads_insights_reports.account_id',
                AdsType::TIKTOK->value,
            );
        }

        DeliveryInsightsReportFilters::apply($query, $filters, 'ads');

        return $query->get();
    }
}
