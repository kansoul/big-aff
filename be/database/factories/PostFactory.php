<?php

namespace Database\Factories;

use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Models\File;
use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    protected $model = Post::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(),
            'slug' => fake()->unique()->slug(),
            'lang' => fake()->randomElement(['en', 'vi', 'ja']),
            'note' => fake()->optional()->sentence(),
            'description' => fake()->paragraph(),
            'content' => fake()->text(1000),
            'status' => fake()->randomElement(PostStatus::cases()),
            'is_hidden' => fake()->boolean(20), // 20% chance to be hidden
            'type' => fake()->randomElement(PostType::cases()),
            'category_id' => null, // Assuming nullable, or we can add Category factory later if needed
            'created_by' => 1,
            'updated_by' => 1,
            'published_at' => fake()->optional(0.7)->dateTimeBetween('-1 year', 'now'), // 70% chance to have a slightly older published_at
            'feature_media_id' => function () {
                // Try to get an existing file with path containing 'posts' or '/posts'
                $file = File::where('path', 'like', '%posts%')->inRandomOrder()->first();
                if ($file) {
                    return $file->id;
                }

                // Fallback: create a new file
                return File::factory()->create([
                    'path' => 'posts/'.fake()->uuid().'.png',
                    'disk' => 'public',
                ])->id;
            },
        ];
    }
}
