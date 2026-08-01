<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Campaign>
 */
class CampaignFactory extends Factory
{
    protected $model = Campaign::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $adsType = fake()->randomElement(['google', 'tiktok']);
        $startTime = fake()->dateTimeBetween('-6 months', '-1 month');

        return [
            'account_id' => ($adsType === 'tiktok' ? 'tt_' : 'goog_').fake()->numerify('##########'),
            'campaign_id' => fake()->unique()->numerify('##############'),
            'campaign_name' => ucfirst(fake()->words(fake()->numberBetween(3, 6), true)),
            'ads_type' => $adsType,
            'daily_budget' => fake()->optional(0.7)->randomFloat(2, 10, 1000),
            'lifetime_budget' => null,
            'status' => fake()->randomElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PAUSED', 'ARCHIVED']),
            'start_time' => $startTime,
            'stop_time' => fake()->optional(0.4)->dateTimeBetween($startTime, 'now'),
            'created_by' => User::factory(),
            'updated_by' => null,
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => ['status' => 'ACTIVE']);
    }

    public function paused(): static
    {
        return $this->state(fn () => ['status' => 'PAUSED']);
    }

    public function archived(): static
    {
        return $this->state(fn () => ['status' => 'ARCHIVED']);
    }
}
