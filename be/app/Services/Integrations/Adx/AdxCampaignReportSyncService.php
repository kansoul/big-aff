<?php

namespace App\Services\Integrations\Adx;

use App\Models\AdxCampaign;
use App\Models\AdxCampaignReport;
use App\Models\AdxRevenueReport;
use App\Models\AdxSpendReport;
use Carbon\CarbonPeriod;

class AdxCampaignReportSyncService
{
    public function sync(string $startDate, string $endDate): int
    {
        $count = 0;

        foreach (CarbonPeriod::create($startDate, $endDate) as $date) {
            $count += $this->syncDate($date->toDateString());
        }

        return $count;
    }

    private function syncDate(string $date): int
    {
        $campaignIds = collect()
            ->merge(AdxSpendReport::query()->whereDate('date', $date)->pluck('campaign_id'))
            ->merge(AdxRevenueReport::query()->whereDate('date', $date)->pluck('campaign_id'))
            ->filter()
            ->unique()
            ->values();

        $count = 0;

        foreach ($campaignIds as $campaignId) {
            $campaign = AdxCampaign::query()
                ->with('account')
                ->where('campaign_id', $campaignId)
                ->first();

            $spend = AdxSpendReport::query()
                ->whereDate('date', $date)
                ->where('campaign_id', $campaignId)
                ->selectRaw('
                    MAX(source) as source,
                    MAX(account_id) as account_id,
                    MAX(account_name) as account_name,
                    MAX(campaign_name) as campaign_name,
                    SUM(impressions) as impressions,
                    SUM(clicks) as clicks,
                    SUM(cost) as cost,
                    SUM(landing_view) as landing_view,
                    SUM(get_game_link_click) as get_game_link_click,
                    SUM(detail_view) as detail_view,
                    SUM(get_bonus_click) as get_bonus_click,
                    MAX(currency) as currency
                ')
                ->first();

            $revenue = AdxRevenueReport::query()
                ->whereDate('date', $date)
                ->where('campaign_id', $campaignId)
                ->selectRaw('
                    SUM(impressions) as impressions,
                    SUM(clicks) as clicks,
                    SUM(requests) as requests,
                    SUM(matched_requests) as matched_requests,
                    SUM(viewable_impressions) as viewable_impressions,
                    SUM(total_revenue) as total_revenue,
                    MAX(currency) as currency
                ')
                ->first();

            $spendAmount = (float) ($spend?->cost ?? 0);
            $revenueAmount = (float) ($revenue?->total_revenue ?? 0);
            $profit = $revenueAmount - $spendAmount;
            $adsClicks = (int) ($spend?->clicks ?? 0);
            $adxImpressions = (int) ($revenue?->impressions ?? 0);

            AdxCampaignReport::query()->updateOrCreate(
                [
                    'date' => $date,
                    'source' => $campaign?->source ?? $spend?->source ?? 'other',
                    'account_id' => $campaign?->account?->account_id ?? $spend?->account_id,
                    'campaign_id' => $campaignId,
                    'adx_link_data_id' => null,
                ],
                [
                    'adx_account_id' => $campaign?->account?->id,
                    'adx_campaign_id' => $campaign?->id,
                    'account_name' => $campaign?->account?->account_name ?? $spend?->account_name,
                    'campaign_name' => $campaign?->campaign_name ?? $spend?->campaign_name,
                    'campaign_status' => $campaign?->status,
                    'daily_budget' => (float) ($campaign?->daily_budget ?? 0),
                    'lifetime_budget' => (float) ($campaign?->lifetime_budget ?? 0),
                    'spend' => $spendAmount,
                    'revenue' => $revenueAmount,
                    'profit' => $profit,
                    'roi' => $spendAmount > 0 ? ($profit / $spendAmount) * 100 : 0,
                    'roas' => $spendAmount > 0 ? $revenueAmount / $spendAmount : 0,
                    'ads_clicks' => $adsClicks,
                    'ads_impressions' => (int) ($spend?->impressions ?? 0),
                    'landing_view' => (float) ($spend?->landing_view ?? 0),
                    'get_game_link_click' => (float) ($spend?->get_game_link_click ?? 0),
                    'detail_view' => (float) ($spend?->detail_view ?? 0),
                    'get_bonus_click' => (float) ($spend?->get_bonus_click ?? 0),
                    'adx_impressions' => $adxImpressions,
                    'adx_clicks' => (int) ($revenue?->clicks ?? 0),
                    'adx_requests' => (int) ($revenue?->requests ?? 0),
                    'adx_matched_requests' => (int) ($revenue?->matched_requests ?? 0),
                    'adx_viewable_impressions' => (int) ($revenue?->viewable_impressions ?? 0),
                    'cpc' => $adsClicks > 0 ? $spendAmount / $adsClicks : 0,
                    'epc' => $adsClicks > 0 ? $revenueAmount / $adsClicks : 0,
                    'rpm' => $adxImpressions > 0 ? ($revenueAmount / $adxImpressions) * 1000 : 0,
                    'currency' => strtoupper($spend?->currency ?? $revenue?->currency ?? 'USD'),
                ],
            );

            $count++;
        }

        return $count;
    }
}
