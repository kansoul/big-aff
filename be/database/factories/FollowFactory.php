<?php

namespace Database\Factories;

use App\Models\AdsLink;
use App\Models\Follow;
use App\Models\Post;
use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Follow>
 */
class FollowFactory extends Factory
{
    protected $model = Follow::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'site_id' => Site::factory(),
            'post_id' => fake()->boolean(40) ? Post::factory() : null,
            'ads_link_id' => fake()->boolean(40) ? AdsLink::factory() : null,
            'style_code' => fake()->optional(0.6)->bothify('style_???###'),
            'channel_code' => fake()->optional(0.6)->bothify('chan_???###'),
        ];
    }
}
