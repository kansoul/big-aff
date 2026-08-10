<?php

namespace Database\Seeders;

use App\Models\File;
use App\Models\Site;
use App\Models\User;
use App\Models\UserSite;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Seeds the site domain (files → sites → user_sites) so ads links have a real site to
 * point at. Runs before AdsSeeder, which wires `ads_links.site_id`.
 */
class SitesSeeder extends Seeder
{
    private const SITE_COUNT = 2;

    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();

        $sites = $this->seedSites($admin);
        $this->seedUserSites($sites, $admin);
    }

    /**
     * Each site gets its own logo + favicon file so `files` is populated with real references.
     *
     * @return Collection<int, Site>
     */
    private function seedSites(User $admin): Collection
    {
        if (Site::query()->count() >= self::SITE_COUNT) {
            return Site::query()->limit(self::SITE_COUNT)->get();
        }

        $missing = self::SITE_COUNT - Site::query()->count();

        for ($i = 0; $i < $missing; $i++) {
            $logo = File::factory()->create(['user_id' => $admin->id]);
            $favicon = File::factory()->create(['user_id' => $admin->id]);

            Site::factory()->create([
                'logo_id' => $logo->id,
                'favicon_id' => $favicon->id,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]);
        }

        return Site::query()->limit(self::SITE_COUNT)->get();
    }

    /**
     * Assigns every seeded site to the admin plus one member, so `user_sites` covers both
     * the admin and a scoped (non-admin) user.
     *
     * @param  Collection<int, Site>  $sites
     */
    private function seedUserSites(Collection $sites, User $admin): void
    {
        $userIds = User::query()
            ->whereIn('email', ['admin@example.com', 'manager1@example.com'])
            ->pluck('id')
            ->push($admin->id)
            ->unique();

        foreach ($sites as $site) {
            foreach ($userIds as $userId) {
                UserSite::query()->firstOrCreate([
                    'user_id' => $userId,
                    'site_id' => $site->id,
                ]);
            }
        }
    }
}
