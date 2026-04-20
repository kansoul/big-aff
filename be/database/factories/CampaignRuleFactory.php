<?php

namespace Database\Factories;

use App\Enums\EntityTypeEnum;
use App\Models\CampaignRule;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CampaignRule>
 */
class CampaignRuleFactory extends Factory
{
    protected $model = CampaignRule::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $entityType = fake()->randomElement(EntityTypeEnum::cases());

        return [
            'user_id' => User::factory(),
            'title' => ucfirst(fake()->words(fake()->numberBetween(2, 5), true)).' Rule',
            'code_rule' => 'RULE_'.strtoupper(Str::random(8)),
            'entity_type' => $entityType,
            'is_active' => fake()->boolean(80),
            'expired_at' => fake()->optional(0.3)->dateTimeBetween('now', '+6 months'),
            'start_hour' => fake()->optional(0.5)->time('H:i'),
            'end_hour' => fake()->optional(0.5)->time('H:i'),
            'min_roi' => null,
            'min_profit' => null,
            'min_revenue' => null,
            'min_spend' => null,
            'max_cpa' => null,
            'min_conversion' => null,
            'min_spend_adset' => null,
        ];
    }

    public function forCampaign(): static
    {
        return $this->state(fn () => [
            'entity_type' => EntityTypeEnum::Campaign,
            'min_roi' => fake()->optional(0.7)->randomFloat(2, 1.0, 5.0),
            'min_profit' => fake()->optional(0.6)->randomFloat(2, 100, 10000),
            'min_revenue' => fake()->optional(0.5)->randomFloat(2, 500, 50000),
            'min_spend' => fake()->optional(0.5)->randomFloat(2, 50, 5000),
        ]);
    }

    public function forAdAdset(): static
    {
        return $this->state(fn () => [
            'entity_type' => EntityTypeEnum::AdAdset,
            'max_cpa' => fake()->optional(0.7)->randomFloat(2, 5, 500),
            'min_conversion' => fake()->optional(0.6)->numberBetween(1, 100),
            'min_spend_adset' => fake()->optional(0.5)->randomFloat(2, 10, 1000),
        ]);
    }

    public function active(): static
    {
        return $this->state(fn () => ['is_active' => true, 'expired_at' => null]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function expired(): static
    {
        return $this->state(fn () => [
            'expired_at' => fake()->dateTimeBetween('-1 month', 'yesterday'),
        ]);
    }
}
