<?php

namespace App\Actions\AdsDeliveryEntities;

use App\Enums\AdsType;
use App\Enums\EntityTypeEnum;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Support\AdsDelivery\DeliveryInsightsReportFilters;
use App\Support\MainTeam\MainTeamReportDataScope;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class GetAdsDeliveryEntitiesAction
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array{adsets: Collection<int, AdsetInsightsReport>, ads: Collection<int, AdsInsightsReport>}
     */
    public function execute(string $campaignId, array $filters): array
    {
        $hasActiveRule = $this->activeRuleExistsConstraint();

        $adsetsQuery = AdsetInsightsReport::query()
            ->addSelect([
                'adset_insights_reports.*',
                'conversion_realtime' => AdsetInsightsReport::conversionRealtimeSubquery(),
                'rpc_est' => AdsetInsightsReport::rpcEstSubquery(),
            ])
            ->withExists(['campaignRules as has_rule' => $hasActiveRule])
            ->where('campaign_id', $campaignId)
            ->orderByDesc('date_start')
            ->orderBy('adset_name');

        $adsQuery = AdsInsightsReport::query()
            ->addSelect([
                'ads_insights_reports.*',
                'conversion_realtime' => AdsInsightsReport::conversionRealtimeSubquery(),
                'rpc_est' => AdsInsightsReport::rpcEstSubquery(),
            ])
            ->withExists(['campaignRules as has_rule' => $hasActiveRule])
            ->where('campaign_id', $campaignId)
            ->orderByDesc('date_start')
            ->orderBy('ad_name');

        (new AccountLinkedOwnerResource)->applyTo($adsetsQuery);
        (new AccountLinkedOwnerResource)->applyTo($adsQuery);

        if (config('main_system.is_main')) {
            MainTeamReportDataScope::excludeNonFetchableAccounts(
                $adsetsQuery,
                'adset_insights_reports.account_id',
                AdsType::TIKTOK->value,
            );
            MainTeamReportDataScope::excludeNonFetchableAccounts(
                $adsQuery,
                'ads_insights_reports.account_id',
                AdsType::TIKTOK->value,
            );
        }

        DeliveryInsightsReportFilters::apply($adsetsQuery, $filters, 'adsets');
        DeliveryInsightsReportFilters::apply($adsQuery, $filters, 'ads');

        return [
            'adsets' => $adsetsQuery->get(),
            'ads' => $adsQuery->get(),
        ];
    }

    /**
     * Constraint for the `campaignRules` existence check: the entity has at least
     * one active, non-expired ad/adset rule attached.
     *
     * @return \Closure(Builder): void
     */
    private function activeRuleExistsConstraint(): \Closure
    {
        return fn ($rule) => $rule
            ->where('entity_type', EntityTypeEnum::AdAdset->value)
            ->where('is_active', true)
            ->where(fn ($expiry) => $expiry->whereNull('expired_at')->orWhereDate('expired_at', '>=', now()->toDateString()));
    }
}
