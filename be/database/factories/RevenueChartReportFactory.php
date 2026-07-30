<?php

namespace Database\Factories;

use App\Models\RevenueChartReport;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RevenueChartReport>
 */
class RevenueChartReportFactory extends Factory
{
    protected $model = RevenueChartReport::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $pageViews = fake()->numberBetween(50, 5000);
        $clicks = (int) ($pageViews * fake()->randomFloat(3, 0.01, 0.08));
        $adRequests = (int) ($pageViews * fake()->randomFloat(2, 0.8, 1.2));
        $impressions = (int) ($adRequests * fake()->randomFloat(2, 0.7, 0.95));
        $estimatedEarnings = round($clicks * fake()->randomFloat(2, 0.10, 0.60), 4);
        $cpc = $clicks > 0 ? round($estimatedEarnings / $clicks, 4) : 0.0;
        $adRequestsRpm = $adRequests > 0 ? round($estimatedEarnings / $adRequests * 1000, 4) : 0.0;
        $impressionsRpm = $impressions > 0 ? round($estimatedEarnings / $impressions * 1000, 4) : 0.0;

        $funnelRequests = fake()->optional(0.7)->numberBetween(10, 500);
        $funnelImpressions = $funnelRequests ? (int) ($funnelRequests * fake()->randomFloat(2, 0.6, 0.9)) : null;
        $funnelClicks = $funnelImpressions ? (int) ($funnelImpressions * fake()->randomFloat(3, 0.01, 0.05)) : null;
        $funnelRpm = ($funnelImpressions && $estimatedEarnings)
            ? round($estimatedEarnings / $funnelImpressions * 1000, 4)
            : null;

        return [
            'ad_client_id' => 'legacy-'.fake()->numerify('##############'),
            'style_code' => 'style_abc001',
            'style_name' => 'Blue Banner',
            'channel_code' => 'chan_tech',
            'channel_name' => 'Tech Channel',
            'datetime' => Carbon::now()->subHours(fake()->numberBetween(0, 168)),
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
