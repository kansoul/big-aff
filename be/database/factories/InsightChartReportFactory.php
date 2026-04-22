<?php

namespace Database\Factories;

use App\Models\InsightChartReport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InsightChartReport>
 */
class InsightChartReportFactory extends Factory
{
    protected $model = InsightChartReport::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $impressions = fake()->numberBetween(100, 200_000);
        $reach = (int) max(1, round($impressions / fake()->randomFloat(2, 1.1, 2.5)));
        $clicks = (int) max(0, round($impressions * fake()->randomFloat(4, 0.002, 0.08)));
        $spend = round($clicks * fake()->randomFloat(2, 0.05, 1.2), 2);

        return [
            'account_id' => fake()->bothify('act_##########'),
            'campaign_id' => fake()->bothify('camp_############'),
            'datetime_start' => fake()->dateTimeBetween('-7 days', 'now'),
            'impressions' => $impressions,
            'reach' => $reach,
            'clicks' => $clicks,
            'ad_clicks' => (int) max(0, round($clicks * fake()->randomFloat(2, 0.4, 0.9))),
            'article_views' => (int) max(0, round($clicks * fake()->randomFloat(2, 0.3, 0.9))),
            'search_views' => (int) max(0, round($clicks * fake()->randomFloat(2, 0.2, 0.8))),
            'search_clicks' => (int) max(0, round($clicks * fake()->randomFloat(2, 0.1, 0.7))),
            'cpa' => fake()->optional(0.6)->randomFloat(2, 1, 200),
            'ctr_link' => $impressions > 0 ? round(($clicks / $impressions) * 100, 4) : 0.0,
            'cpc_link' => $clicks > 0 ? round($spend / $clicks, 4) : 0.0,
            'spend' => $spend,
            'cpc' => $clicks > 0 ? round($spend / $clicks, 4) : 0.0,
            'cpm' => $impressions > 0 ? round($spend / $impressions * 1000, 4) : 0.0,
            'ctr' => $impressions > 0 ? round(($clicks / $impressions) * 100, 4) : 0.0,
            'frequency' => $reach > 0 ? round($impressions / $reach, 4) : 1.0,
            'spend_type' => 'USD',
        ];
    }
}
