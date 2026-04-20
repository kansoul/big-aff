<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(fake()->numberBetween(1, 3), true),
            'description' => fake()->optional(0.7)->sentence(),
            'created_by' => User::factory(),
            'updated_by' => null,
        ];
    }
}
