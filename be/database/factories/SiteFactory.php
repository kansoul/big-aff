<?php

namespace Database\Factories;

use App\Enums\SiteStatus;
use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Site>
 */
class SiteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->company(),
            'url' => $this->faker->unique()->url(),
            'secret_key' => Str::random(40),
            'settings' => null,
            'description' => $this->faker->sentence(),
            'status' => SiteStatus::ACTIVE->value,
        ];
    }

    public function maintenance(): static
    {
        return $this->state(['status' => SiteStatus::MAINTENANCE->value]);
    }

    public function suspended(): static
    {
        return $this->state(['status' => SiteStatus::SUSPENDED->value]);
    }
}
