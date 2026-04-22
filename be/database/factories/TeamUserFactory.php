<?php

namespace Database\Factories;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeamUser>
 */
class TeamUserFactory extends Factory
{
    protected $model = TeamUser::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'user_id' => User::factory(),
            'joined_at' => fake()->dateTimeBetween('-6 months', 'now'),
            'team_role' => fake()->randomElement(TeamRole::cases()),
        ];
    }
}
