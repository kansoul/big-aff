<?php

namespace Database\Factories;

use App\Models\MainTeam;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<MainTeam>
 */
class MainTeamFactory extends Factory
{
    protected $model = MainTeam::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company().' Main Team',
            'description' => fake()->sentence(),
            'token' => Str::random(64),
            'sync_campaign_reports' => true,
        ];
    }

    public function withoutSync(): static
    {
        return $this->state(['sync_campaign_reports' => false]);
    }
}
