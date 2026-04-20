<?php

namespace Database\Factories;

use App\Models\AdClient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AdClient>
 */
class AdClientFactory extends Factory
{
    protected $model = AdClient::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'ad_client_id' => 'ca-pub-'.fake()->unique()->numerify('##############'),
            'product_code' => fake()->optional(0.6)->bothify('P-###-???'),
            'product_name' => fake()->optional(0.7)->words(2, true),
        ];
    }
}
