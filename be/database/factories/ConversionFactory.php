<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Conversion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Conversion>
 */
class ConversionFactory extends Factory
{
    protected $model = Conversion::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'article_view' => fake()->optional(0.8)->bothify('av_##########'),
            'rsu_click' => fake()->optional(0.8)->bothify('rc_##########'),
            'search_view' => fake()->optional(0.8)->bothify('sv_##########'),
            'search_click' => fake()->optional(0.8)->bothify('sc_##########'),
        ];
    }
}
