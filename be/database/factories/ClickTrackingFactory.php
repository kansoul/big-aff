<?php

namespace Database\Factories;

use App\Models\ClickTracking;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClickTracking>
 */
class ClickTrackingFactory extends Factory
{
    protected $model = ClickTracking::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $eventTime = fake()->dateTimeBetween('-3 days', 'now');

        return [
            'session_id' => fake()->uuid(),
            'campaign_id' => fake()->numerify('##############'),
            'adset_id' => fake()->numerify('################'),
            'ad_id' => fake()->numerify('################'),
            'event_type' => fake()->randomElement(['click_ad', 'click_keyword']),
            'page' => fake()->url(),
            'payload' => ['referrer' => fake()->url()],
            'event_time' => $eventTime,
            'created_at' => $eventTime,
        ];
    }

    public function clickAd(): static
    {
        return $this->state(['event_type' => 'click_ad']);
    }

    public function clickKeyword(): static
    {
        return $this->state(['event_type' => 'click_keyword']);
    }
}
