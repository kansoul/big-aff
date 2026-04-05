<?php

namespace Database\Factories;

use App\Models\Style;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Style>
 */
class StyleFactory extends Factory
{
    protected $model = Style::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $code = fake()->unique()->bothify('style_???###');

        return [
            'style_code' => $code,
            'name' => fake()->words(2, true),
        ];
    }
}
