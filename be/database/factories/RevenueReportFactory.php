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
        return [
            'session_id' => fake()->unique()->uuid(),
            'campaign_id' => fake()->numerify('##############'),
            'adset_id' => fake()->optional()->numerify('##############'),
            'ad_id' => fake()->optional()->numerify('##############'),
            'click_id' => fake()->unique()->numberBetween(1, 2_000_000_000),
            'estimate_earning' => fake()->randomFloat(4, 0, 100),
            'page_views' => fake()->numberBetween(0, 10_000),
            'clicks' => fake()->numberBetween(0, 1_000),
            'ad_requests' => fake()->numberBetween(0, 10_000),
            'impressions' => fake()->numberBetween(0, 10_000),
            'ad_requests_rpm' => fake()->randomFloat(4, 0, 100),
            'impressions_rpm' => fake()->randomFloat(4, 0, 100),
            'cost_per_click' => fake()->randomFloat(4, 0, 10),
            'funnel_requests' => fake()->numberBetween(0, 10_000),
            'funnel_impressions' => fake()->numberBetween(0, 10_000),
            'funnel_clicks' => fake()->numberBetween(0, 1_000),
            'funnel_rpm' => fake()->randomFloat(4, 0, 100),
        ];
    }
}
