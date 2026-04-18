<?php

namespace Database\Factories;

use App\Models\RevenueReport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RevenueReport>
 */
class RevenueReportFactory extends Factory
{
    protected $model = RevenueReport::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $pageViews = fake()->numberBetween(500, 50000);
        $clicks = (int) ($pageViews * fake()->randomFloat(3, 0.01, 0.08));
        $adRequests = (int) ($pageViews * fake()->randomFloat(2, 0.8, 1.2));
        $impressions = (int) ($adRequests * fake()->randomFloat(2, 0.7, 0.95));
        $estimatedEarnings = round($clicks * fake()->randomFloat(2, 0.10, 0.60), 4);
        $cpc = $clicks > 0 ? round($estimatedEarnings / $clicks, 4) : 0;
        $adRequestsRpm = $adRequests > 0 ? round($estimatedEarnings / $adRequests * 1000, 4) : 0;
        $impressionsRpm = $impressions > 0 ? round($estimatedEarnings / $impressions * 1000, 4) : 0;

        $funnelRequests = fake()->optional(0.7)->numberBetween(100, 5000);
        $funnelImpressions = $funnelRequests ? (int) ($funnelRequests * fake()->randomFloat(2, 0.6, 0.9)) : null;
        $funnelClicks = $funnelImpressions ? (int) ($funnelImpressions * fake()->randomFloat(3, 0.01, 0.05)) : null;
        $funnelRpm = ($funnelImpressions && $estimatedEarnings)
            ? round($estimatedEarnings / $funnelImpressions * 1000, 4)
            : null;

        static $styleCodes = ['style_abc001', 'style_def002', 'style_ghi003', 'style_jkl004', 'style_mno005'];
        static $channelCodes = ['chan_tech', 'chan_lifestyle', 'chan_finance', 'chan_health', 'chan_sports'];
        static $styleNames = ['Blue Banner', 'Red Square', 'Green Leaderboard', 'Purple Skyscraper', 'Orange Native'];
        static $channelNames = ['Tech Channel', 'Lifestyle Channel', 'Finance Channel', 'Health Channel', 'Sports Channel'];

        $styleIndex = array_rand($styleCodes);
        $channelIndex = array_rand($channelCodes);

        return [
            'ad_client_id' => 'ca-pub-'.fake()->numerify('##############'),
            'style_code' => $styleCodes[$styleIndex],
            'style_name' => $styleNames[$styleIndex],
            'channel_code' => $channelCodes[$channelIndex],
            'channel_name' => $channelNames[$channelIndex],
            'date' => fake()->dateTimeBetween('-3 months', 'now')->format('Y-m-d'),
            'page_views' => $pageViews,
            'clicks' => $clicks,
            'estimated_earnings' => $estimatedEarnings,
            'ad_requests' => $adRequests,
            'impressions' => $impressions,
            'ad_requests_rpm' => $adRequestsRpm,
            'impressions_rpm' => $impressionsRpm,
            'cost_per_click' => $cpc,
            'funnel_requests' => $funnelRequests,
            'funnel_impressions' => $funnelImpressions,
            'funnel_clicks' => $funnelClicks,
            'funnel_rpm' => $funnelRpm,
        ];
    }
}
