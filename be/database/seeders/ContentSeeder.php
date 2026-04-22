<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\File;
use App\Models\Follow;
use App\Models\KeywordSet;
use App\Models\Post;
use App\Models\PostKeywordSet;
use App\Models\Site;
use App\Models\User;
use App\Models\UserSite;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

class ContentSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();

        $files = File::query()->exists()
            ? File::query()->limit(30)->get()
            : File::factory()->count(30)->create([
                'user_id' => $admin->id,
            ]);

        $categories = Category::query()->exists()
            ? Category::query()->limit(8)->get()
            : Category::factory()->count(8)->create([
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]);

        $sites = $this->seedSites($admin, $files);
        $keywordSets = $this->seedKeywordSets($admin);
        $posts = $this->seedPosts($admin, $categories, $files);

        $this->seedPostKeywordSetsPivot($posts, $keywordSets);
        $this->seedUserSitesPivot($admin, $sites);
        $this->seedFollows($sites, $posts);
    }

    /**
     * @return Collection<int, Site>
     */
    private function seedSites(User $admin, Collection $files): Collection
    {
        if (Site::query()->exists()) {
            return Site::query()->limit(8)->get();
        }

        return Site::factory()->count(8)->create([
            'logo_id' => $files->random()->id,
            'favicon_id' => $files->random()->id,
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);
    }

    /**
     * @return Collection<int, KeywordSet>
     */
    private function seedKeywordSets(User $admin): Collection
    {
        if (KeywordSet::query()->exists()) {
            return KeywordSet::query()->limit(15)->get();
        }

        return KeywordSet::factory()->count(15)->create([
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);
    }

    /**
     * @param  Collection<int, Category>  $categories
     * @return Collection<int, Post>
     */
    private function seedPosts(User $admin, Collection $categories, Collection $files): Collection
    {
        if (Post::query()->exists()) {
            return Post::query()->limit(30)->get();
        }

        return Post::factory()
            ->count(30)
            ->create([
                'category_id' => null,
                'feature_media_id' => $files->random()->id,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ])
            ->each(function (Post $post) use ($categories) {
                $post->update([
                    'category_id' => $categories->random()->id,
                ]);
            });
    }

    /**
     * @param  Collection<int, Post>  $posts
     * @param  Collection<int, KeywordSet>  $keywordSets
     */
    private function seedPostKeywordSetsPivot(Collection $posts, Collection $keywordSets): void
    {
        foreach ($posts as $post) {
            $attach = $keywordSets->random(fake()->numberBetween(0, 3))->pluck('id')->all();

            foreach ($attach as $keywordSetId) {
                PostKeywordSet::query()->firstOrCreate([
                    'post_id' => $post->id,
                    'keyword_set_id' => $keywordSetId,
                ]);
            }
        }
    }

    /**
     * Ensure admin has access to all sites via `user_sites`.
     *
     * @param  Collection<int, Site>  $sites
     */
    private function seedUserSitesPivot(User $admin, Collection $sites): void
    {
        foreach ($sites as $site) {
            UserSite::query()->firstOrCreate([
                'user_id' => $admin->id,
                'site_id' => $site->id,
            ]);
        }
    }

    /**
     * @param  Collection<int, Site>  $sites
     * @param  Collection<int, Post>  $posts
     */
    private function seedFollows(Collection $sites, Collection $posts): void
    {
        if (Follow::query()->exists()) {
            return;
        }

        Follow::factory()
            ->count(50)
            ->state(fn () => [
                'post_id' => $posts->random()->id,
            ])
            ->create();
    }
}
