<?php

namespace App\Actions\AdsDeliveryEntities;

use App\Models\Account;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Support\OwnershipFilter\OwnershipFilter;
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
        $ownership = OwnershipFilter::forAuthUser();

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

        $ownership->applyThrough(
            $adsetsQuery,
            'adset_insights_reports.account_id',
            fn (array $ids) => Account::join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $ids)
                ->select('accounts.id'),
        );
        $ownership->applyThrough(
            $adsQuery,
            'ads_insights_reports.account_id',
            fn (array $ids) => Account::join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $ids)
                ->select('accounts.id'),
        );

        $this->applyFilters($adsetsQuery, $filters, 'adsets');
        $this->applyFilters($adsQuery, $filters, 'ads');

        return [
            'adsets' => $adsetsQuery->get(),
            'ads' => $adsQuery->get(),
        ];
    }

    /**
     * @param  Builder<AdsetInsightsReport|AdsInsightsReport>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(Builder $query, array $filters, string $type): void
    {
        if (! empty($filters['date_from'])) {
            $query->whereDate('date_start', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('date_start', '<=', $filters['date_to']);
        }

        if (! empty($filters['created_time_from'])) {
            $query->whereDate('created_time', '>=', $filters['created_time_from']);
        }

        if (! empty($filters['created_time_to'])) {
            $query->whereDate('created_time', '<=', $filters['created_time_to']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if ($type === 'adsets') {
            if (! empty($filters['adset_id'])) {
                $query->where('adset_id', 'like', '%'.$filters['adset_id'].'%');
            }
            if (! empty($filters['adset_name'])) {
                $query->where('adset_name', 'like', '%'.$filters['adset_name'].'%');
            }
        } else {
            if (! empty($filters['ad_id'])) {
                $query->where('ad_id', 'like', '%'.$filters['ad_id'].'%');
            }
            if (! empty($filters['ad_name'])) {
                $query->where('ad_name', 'like', '%'.$filters['ad_name'].'%');
            }
        }
    }
}
