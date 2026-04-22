<?php

namespace Database\Factories;

use App\Models\KeywordSet;
use App\Models\Post;
use App\Models\PostKeywordSet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PostKeywordSet>
 */
class PostKeywordSetFactory extends Factory
{
    protected $model = PostKeywordSet::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'post_id' => Post::factory(),
            'keyword_set_id' => KeywordSet::factory(),
        ];
    }
}
