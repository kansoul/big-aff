<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserParentChild>
 */
class UserParentChildFactory extends Factory
{
    protected $model = UserParentChild::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'parent_user_id' => User::factory(),
            'child_user_id' => User::factory(),
        ];
    }
}
