<?php

namespace Database\Factories;

use App\Models\RealtimeReport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RealtimeReport>
 */
class RealtimeReportFactory extends Factory
{
    protected $model = RealtimeReport::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'event_time' => fake()->dateTimeBetween('-30 days', 'now')->format('Y-m-d'),
            'campaign_id' => fake()->numerify('##############'),
            'view_article_count' => fake()->numberBetween(0, 1000),
            'view_search_count' => fake()->numberBetween(0, 1000),
            'click_keyword_count' => fake()->numberBetween(0, 300),
            'click_ad_count' => fake()->numberBetween(0, 300),
        ];
    }
}
