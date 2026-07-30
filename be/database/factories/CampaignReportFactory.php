<?php

namespace Database\Factories;

use App\Models\CampaignReport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CampaignReport>
 */
class CampaignReportFactory extends Factory
{
    protected $model = CampaignReport::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // — Ads (spend) side —
        $reach = fake()->numberBetween(1_000, 80_000);
        $impressions = (int) ($reach * fake()->randomFloat(2, 1.0, 2.5));
        $clicks = (int) ($impressions * fake()->randomFloat(4, 0.005, 0.05));
        $adClicks = (int) ($clicks * fake()->randomFloat(2, 0.4, 0.9));
        $spend = round($clicks * fake()->randomFloat(2, 0.10, 0.80), 2);
        $cpc = $clicks > 0 ? round($spend / $clicks, 4) : 0.0;
        $cpm = $impressions > 0 ? round($spend / $impressions * 1000, 4) : 0.0;
        $ctr = $impressions > 0 ? round($clicks / $impressions * 100, 4) : 0.0;
        $ctrLink = $impressions > 0 ? round($adClicks / $impressions * 100, 4) : 0.0;
        $cpcLink = $adClicks > 0 ? round($spend / $adClicks, 4) : 0.0;
        $articleViews = (int) ($adClicks * fake()->randomFloat(2, 0.6, 0.95));
        $searchViews = (int) ($articleViews * fake()->randomFloat(2, 0.3, 0.7));
        $frequency = $reach > 0 ? round($impressions / $reach, 4) : 1.0;

        // Revenue side
        $rSearchViews = (int) ($searchViews * fake()->randomFloat(2, 0.8, 1.2));
        $rAdRequests = (int) ($rSearchViews * fake()->randomFloat(2, 0.9, 1.1));
        $rImpressions = (int) ($rAdRequests * fake()->randomFloat(2, 0.85, 1.0));
        $rFunnelReqs = (int) ($rAdRequests * fake()->randomFloat(2, 0.5, 0.9));
        $rFunnelImps = (int) ($rFunnelReqs * fake()->randomFloat(2, 0.7, 1.0));
        $rFunnelClicks = (int) ($rFunnelImps * fake()->randomFloat(4, 0.01, 0.08));
        $rRpc = round(fake()->randomFloat(4, 0.05, 0.80), 4);
        $rRevenue = round($rSearchViews * $rRpc, 2);
        $rAdReqRpm = $rAdRequests > 0 ? round($rRevenue / $rAdRequests * 1000, 4) : 0.0;
        $rImpRpm = $rImpressions > 0 ? round($rRevenue / $rImpressions * 1000, 4) : 0.0;
        $rFunnelRpm = $rFunnelImps > 0 ? round($rRevenue / $rFunnelImps * 1000, 4) : 0.0;

        $adsType = fake()->randomElement(['google', 'tiktok']);

        return [
            'realtime_report_id' => null,
            'date_start' => fake()->dateTimeBetween('-3 months', 'now')->format('Y-m-d'),
            'account_id' => null, // override in seeder
            'account_name' => fake()->company().' Ads',
            'campaign_id' => 'camp_'.fake()->unique()->numerify('##############'),
            'campaign_name' => ucfirst(fake()->words(fake()->numberBetween(3, 5), true)),
            'campaign_status' => fake()->randomElement(['ACTIVE', 'ACTIVE', 'PAUSED', 'ARCHIVED']),
            'ads_type' => $adsType,
            'daily_budget' => round(fake()->randomFloat(2, 50, 2_000), 2),
            'lifetime_budget' => null,
            // revenue side
            'style_code' => 'style_'.fake()->lexify('???###'),
            'style_name' => fake()->words(2, true),
            'channel_code' => 'chan_'.fake()->lexify('???###'),
            'channel_name' => fake()->words(2, true),
            'r_search_views' => $rSearchViews,
            'r_conversion' => fake()->numberBetween(0, 20),
            'r_revenue' => $rRevenue,
            'r_rpc' => $rRpc,
            'r_ad_requests' => $rAdRequests,
            'r_ad_requests_rpm' => $rAdReqRpm,
            'r_impressions' => $rImpressions,
            'r_impressions_rpm' => $rImpRpm,
            'r_funnel_requests' => $rFunnelReqs,
            'r_funnel_clicks' => $rFunnelClicks,
            'r_funnel_impressions' => $rFunnelImps,
            'r_funnel_rpm' => $rFunnelRpm,
            'r_cpa' => fake()->randomFloat(2, 0, 50),
            // ads/spend side
            'a_ad_clicks' => $adClicks,
            'a_article_views' => $articleViews,
            'a_search_views' => $searchViews,
            'a_conversion' => fake()->numberBetween(0, 30),
            'a_spend' => $spend,
            'a_impressions' => $impressions,
            'a_cpc' => $cpc,
            'a_cpm' => $cpm,
            'a_ctr' => $ctr,
            'a_reach' => $reach,
            'a_cpa' => fake()->randomFloat(2, 0, 50),
            'a_ctr_link' => $ctrLink,
            'a_cpc_link' => $cpcLink,
            'a_frequency' => $frequency,
            'a_clicks' => $clicks,
        ];
    }
}
