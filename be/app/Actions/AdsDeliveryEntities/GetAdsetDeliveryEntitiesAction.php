<?php

namespace App\Actions\AdsDeliveryEntities;

use App\Enums\AdsType;
use App\Models\AdsetInsightsReport;
use App\Support\AdsDelivery\DeliveryInsightsReportFilters;
use App\Support\MainTeam\MainTeamReportDataScope;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use Illuminate\Support\Collection;

class GetAdsetDeliveryEntitiesAction
{
    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, AdsetInsightsReport>
     */
    public function execute(string $campaignId, array $filters): Collection
    {
        $query = AdsetInsightsReport::query()
            ->addSelect([
                'adset_insights_reports.*',
                'conversion_realtime' => AdsetInsightsReport::conversionRealtimeSubquery(),
                'rpc_est' => AdsetInsightsReport::rpcEstSubquery(),
            ])
            ->where('campaign_id', $campaignId)
            ->orderByDesc('date_start')
            ->orderBy('adset_name');

        (new AccountLinkedOwnerResource)->applyTo($query);

        if (config('main_system.is_main')) {
            MainTeamReportDataScope::excludeNonFetchableAccounts(
                $query,
                'adset_insights_reports.account_id',
                AdsType::TIKTOK->value,
            );
        }

        DeliveryInsightsReportFilters::apply($query, $filters, 'adsets');

        return $query->get();
    }
}
