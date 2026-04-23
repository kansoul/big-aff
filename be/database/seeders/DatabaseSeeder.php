<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            // 1. Identity graph: roles (Admin), admin user, managers, analysts, members, teams.
            CreateRoleAdminSeeder::class,
            CoreSeeder::class,

            // 2. Content entities that many other tables reference (files, sites, posts, etc.).
            ContentSeeder::class,

            // 3. Ads graph: styles, channels, accounts, campaigns, ads_links, link_datas.
            //    Must run before reports/tracking which reference campaign_id / channel_code.
            AdsSeeder::class,

            // 4. Tracking events — needs real link_datas and campaigns.
            TrackingSeeder::class,

            // 5. Daily / insight / revenue / campaign reports — needs ads + tracking data.
            ReportsSeeder::class,

            // 6. Rules, conversions, schedules — needs users, accounts, campaigns.
            RulesSeeder::class,
        ]);
    }
}
