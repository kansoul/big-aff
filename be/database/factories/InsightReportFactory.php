<?php

namespace Database\Factories;

use App\Models\InsightReport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InsightReport>
 */
class InsightReportFactory extends Factory
{
    protected $model = InsightReport::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $accountPrefix = fake()->randomElement(['goog_', 'tt_']);
        $reach = fake()->numberBetween(500, 50_000);
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
        $searchClicks = (int) ($searchViews * fake()->randomFloat(4, 0.01, 0.1));

        return [
            'account_id' => $accountPrefix.fake()->numerify('##########'),
            'campaign_id' => fake()->numerify('##############'),
            'date_start' => fake()->dateTimeBetween('-3 months', 'now')->format('Y-m-d'),
            'impressions' => $impressions,
            'reach' => $reach,
            'clicks' => $clicks,
            'ad_clicks' => $adClicks,
            'article_views' => $articleViews,
            'search_views' => $searchViews,
            'search_clicks' => $searchClicks,
            'cpa' => fake()->optional(0.5)->randomFloat(2, 1, 50),
            'ctr_link' => $ctrLink,
            'cpc_link' => $cpcLink,
            'spend' => $spend,
            'cpc' => $cpc,
            'cpm' => $cpm,
            'ctr' => $ctr,
            'frequency' => $reach > 0 ? round($impressions / $reach, 4) : 1.0,
            'spend_type' => 'USD',
        ];
    }
}
