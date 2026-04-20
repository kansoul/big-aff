<?php

namespace Database\Factories;

use App\Models\BusinessCenter;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BusinessCenter>
 */
class BusinessCenterFactory extends Factory
{
    protected $model = BusinessCenter::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $owner = User::factory();

        return [
            'bc_id' => fake()->optional(0.7)->bothify('bc_##########'),
            'name' => fake()->company(),
            'ads_type' => fake()->randomElement(['facebook', 'google']),
            'team_id' => Team::factory(),
            'created_by' => $owner,
            'updated_by' => null,
        ];
    }
}
