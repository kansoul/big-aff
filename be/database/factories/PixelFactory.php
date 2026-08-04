<?php

namespace Database\Factories;

use App\Models\Pixel;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Pixel> */
class PixelFactory extends Factory
{
    protected $model = Pixel::class;

    public function definition(): array
    {
        return [
            'pixel_id' => strtoupper(fake()->bothify('C##################')),
            'name' => fake()->optional()->words(3, true),
        ];
    }
}
