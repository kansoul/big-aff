<?php

namespace Database\Factories;

use App\Models\AdsConversion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AdsConversion>
 */
class AdsConversionFactory extends Factory
{
    protected $model = AdsConversion::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $conversionDateTime = fake()->dateTimeBetween('-30 days', 'now');

        return [
            'account_id' => fake()->optional(0.9)->bothify('goog_##########'),
            'campaign_id' => fake()->optional(0.8)->bothify('###########'),
            'gclid' => fake()->optional(0.7)->regexify('[A-Za-z0-9_-]{25,80}'),
            'wbraid' => fake()->optional(0.2)->regexify('[A-Za-z0-9_-]{10,80}'),
            'gbraid' => fake()->optional(0.2)->regexify('[A-Za-z0-9_-]{10,80}'),
            'conversion_action_resource_name' => fake()->optional(0.6)->words(4, true),
            'conversion_value' => fake()->optional(0.8)->randomFloat(6, 0.01, 5),
            'currency_code' => fake()->optional(0.8)->randomElement(['USD', 'VND', 'EUR']),
            'conversion_date_time' => $conversionDateTime,
            'synced_at' => fake()->optional(0.5)->dateTimeBetween($conversionDateTime, 'now'),
        ];
    }
}
