<?php

namespace Database\Factories;

use App\Models\AdsetInsightsReport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AdsetInsightsReport>
 */
class AdsetInsightsReportFactory extends Factory
{
    protected $model = AdsetInsightsReport::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $impressions = fake()->numberBetween(500, 20_000);
        $clicks = (int) max(1, $impressions * fake()->randomFloat(3, 0.005, 0.05));
        $spend = round($clicks * fake()->randomFloat(2, 0.05, 0.80), 2);
        $date = fake()->dateTimeBetween('-3 days', 'now');

        return [
            'adset_id' => fake()->numerify('################'),
            'adset_name' => 'Adset '.fake()->words(2, true),
            'campaign_id' => fake()->numerify('##############'),
            'account_id' => fake()->numerify('############'),
            'status' => 'ENABLE',
            'effective_status' => 'ENABLE',
            'daily_budget' => fake()->randomFloat(2, 10, 500),
            'spend' => $spend,
            'date_start' => $date,
            'date_stop' => $date,
            'impressions' => $impressions,
            'clicks' => $clicks,
            'reach' => (int) ($impressions * fake()->randomFloat(2, 0.5, 0.9)),
            'cpc' => $clicks > 0 ? round($spend / $clicks, 4) : 0,
            'cpm' => round($spend / $impressions * 1000, 4),
            'ctr' => round($clicks / $impressions * 100, 4),
            'cpa' => fake()->randomFloat(4, 0.5, 20),
            'ad_clicks' => fake()->numberBetween(0, $clicks),
            'article_views' => fake()->numberBetween(0, 500),
            'search_views' => fake()->numberBetween(0, 500),
            'search_click' => fake()->numberBetween(0, 200),
            'inline_link_click_ctr' => fake()->randomFloat(4, 0, 5),
            'cost_per_inline_link_click' => fake()->randomFloat(4, 0, 5),
            'frequency' => fake()->randomFloat(2, 1, 4),
            'created_time' => $date,
            'updated_time' => $date,
        ];
    }
}
