<?php

namespace App\Actions\AdsDeliveryEntities;

use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Support\AdsDelivery\DeliveryInsightsReportFilters;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use Illuminate\Support\Collection;

class GetAdsDeliveryEntitiesAction
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array{adsets: Collection<int, AdsetInsightsReport>, ads: Collection<int, AdsInsightsReport>}
     */
    public function execute(string $campaignId, array $filters): array
    {
        $adsetsQuery = AdsetInsightsReport::query()
            ->addSelect([
                'adset_insights_reports.*',
                'conversion_realtime' => AdsetInsightsReport::conversionRealtimeSubquery(),
                'rpc_est' => AdsetInsightsReport::rpcEstSubquery(),
            ])
            ->where('campaign_id', $campaignId)
            ->orderByDesc('date_start')
            ->orderBy('adset_name');

        $adsQuery = AdsInsightsReport::query()
            ->addSelect([
                'ads_insights_reports.*',
                'conversion_realtime' => AdsInsightsReport::conversionRealtimeSubquery(),
                'rpc_est' => AdsInsightsReport::rpcEstSubquery(),
            ])
            ->where('campaign_id', $campaignId)
            ->orderByDesc('date_start')
            ->orderBy('ad_name');

        (new AccountLinkedOwnerResource)->applyTo($adsetsQuery);
        (new AccountLinkedOwnerResource)->applyTo($adsQuery);

        DeliveryInsightsReportFilters::apply($adsetsQuery, $filters, 'adsets');
        DeliveryInsightsReportFilters::apply($adsQuery, $filters, 'ads');

        return [
            'adsets' => $adsetsQuery->get(),
            'ads' => $adsQuery->get(),
        ];
    }
}
