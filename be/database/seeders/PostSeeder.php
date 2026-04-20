<?php

namespace Database\Seeders;

use App\Models\KeywordSet;
use App\Models\Post;
use Illuminate\Database\Seeder;

class PostSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Require dummy keyword sets
        $keywordSets = KeywordSet::factory()->count(10)->create();

        // Create 20 posts and attach random keyword sets to each
        Post::factory()->count(20)->create()->each(function ($post) use ($keywordSets) {
            $post->keywordSets()->attach(
                $keywordSets->random(rand(0, 3))->pluck('id')->toArray()
            );
        });
    }
}
