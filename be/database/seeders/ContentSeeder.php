<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\File;
use App\Models\KeywordSet;
use App\Models\Post;
use App\Models\PostKeywordSet;
use App\Models\Site;
use App\Models\User;
use App\Models\UserSite;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Seeds content-side entities so every table has realistic data:
 *   - files, categories, sites (+ user_sites pivot)
 *   - keyword_sets, posts, post_keyword_sets pivot
 *
 * All created rows are owned by admin@example.com so OwnershipFilter queries succeed.
 * `follows` rows are seeded by AdsSeeder where real channel/style codes exist.
 */
class ContentSeeder extends Seeder
{
    private const FILE_COUNT = 30;

    private const CATEGORY_COUNT = 8;

    private const SITE_COUNT = 8;

    private const KEYWORD_SET_COUNT = 15;

    private const POST_COUNT = 30;

    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $managers = User::query()
            ->whereIn('email', ['manager1@example.com', 'manager2@example.com'])
            ->get();

        $files = $this->seedFiles($admin);
        $categories = $this->seedCategories($admin);
        $sites = $this->seedSites($admin, $files);
        $keywordSets = $this->seedKeywordSets($admin);
        $posts = $this->seedPosts($admin, $categories, $files);

        $this->seedPostKeywordSetsPivot($posts, $keywordSets);
        $this->seedUserSitesPivot($sites, $admin, $managers);
    }

    /**
     * @return Collection<int, File>
     */
    private function seedFiles(User $admin): Collection
    {
        if (File::query()->count() >= self::FILE_COUNT) {
            return File::query()->limit(self::FILE_COUNT)->get();
        }

        $missing = self::FILE_COUNT - File::query()->count();

        File::factory()->count($missing)->create([
            'user_id' => $admin->id,
        ]);

        return File::query()->limit(self::FILE_COUNT)->get();
    }

    /**
     * @return Collection<int, Category>
     */
    private function seedCategories(User $admin): Collection
    {
        if (Category::query()->count() >= self::CATEGORY_COUNT) {
            return Category::query()->limit(self::CATEGORY_COUNT)->get();
        }

        $missing = self::CATEGORY_COUNT - Category::query()->count();

        Category::factory()->count($missing)->create([
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);

        return Category::query()->limit(self::CATEGORY_COUNT)->get();
    }

    /**
     * @param  Collection<int, File>  $files
     * @return Collection<int, Site>
     */
    private function seedSites(User $admin, Collection $files): Collection
    {
        if (Site::query()->count() >= self::SITE_COUNT) {
            return Site::query()->limit(self::SITE_COUNT)->get();
        }

        $missing = self::SITE_COUNT - Site::query()->count();

        Site::factory()->count($missing)->create([
            'logo_id' => $files->random()->id,
            'favicon_id' => $files->random()->id,
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);

        return Site::query()->limit(self::SITE_COUNT)->get();
    }

    /**
     * @return Collection<int, KeywordSet>
     */
    private function seedKeywordSets(User $admin): Collection
    {
        if (KeywordSet::query()->count() >= self::KEYWORD_SET_COUNT) {
            return KeywordSet::query()->limit(self::KEYWORD_SET_COUNT)->get();
        }

        $missing = self::KEYWORD_SET_COUNT - KeywordSet::query()->count();

        KeywordSet::factory()->count($missing)->create([
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);

        return KeywordSet::query()->limit(self::KEYWORD_SET_COUNT)->get();
    }

    /**
     * @param  Collection<int, Category>  $categories
     * @param  Collection<int, File>  $files
     * @return Collection<int, Post>
     */
    private function seedPosts(User $admin, Collection $categories, Collection $files): Collection
    {
        if (Post::query()->count() >= self::POST_COUNT) {
            return Post::query()->limit(self::POST_COUNT)->get();
        }

        $missing = self::POST_COUNT - Post::query()->count();

        Post::factory()
            ->count($missing)
            ->make([
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ])
            ->each(function (Post $post) use ($categories, $files): void {
                $post->category_id = $categories->random()->id;
                $post->feature_media_id = $files->random()->id;
                $post->save();
            });

        return Post::query()->limit(self::POST_COUNT)->get();
    }

    /**
     * @param  Collection<int, Post>  $posts
     * @param  Collection<int, KeywordSet>  $keywordSets
     */
    private function seedPostKeywordSetsPivot(Collection $posts, Collection $keywordSets): void
    {
        foreach ($posts as $post) {
            $attachCount = fake()->numberBetween(0, 3);
            if ($attachCount === 0 || $keywordSets->isEmpty()) {
                continue;
            }

            $attach = $keywordSets->random(min($attachCount, $keywordSets->count()));

            foreach ($attach as $keywordSet) {
                PostKeywordSet::query()->firstOrCreate([
                    'post_id' => $post->id,
                    'keyword_set_id' => $keywordSet->id,
                ]);
            }
        }
    }

    /**
     * @param  Collection<int, Site>  $sites
     * @param  \Illuminate\Database\Eloquent\Collection<int, User>  $managers
     */
    private function seedUserSitesPivot(Collection $sites, User $admin, \Illuminate\Database\Eloquent\Collection $managers): void
    {
        $users = $managers->concat([$admin]);

        foreach ($sites as $site) {
            foreach ($users as $user) {
                UserSite::query()->firstOrCreate([
                    'user_id' => $user->id,
                    'site_id' => $site->id,
                ]);
            }
        }
    }
}
