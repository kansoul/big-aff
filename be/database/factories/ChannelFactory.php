<?php

namespace Database\Factories;

use App\Models\Channel;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Channel>
 */
class ChannelFactory extends Factory
{
    protected $model = Channel::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => 'chan_'.Str::lower(fake()->unique()->lexify('??????')),
            'name' => fake()->words(fake()->numberBetween(1, 3), true),
            'is_active' => fake()->boolean(85),
            'created_by' => User::factory(),
            'updated_by' => null,
        ];
    }
}
