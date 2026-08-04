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

            // 2. Ads graph: accounts, campaigns, and ads_links.
            //    Must run before reports/tracking which reference campaign identifiers.
            AdsSeeder::class,

            // 3. Tracking events — needs real campaigns.
            TrackingSeeder::class,

            // 4. Daily / insight / revenue / campaign reports — needs ads + tracking data.
            ReportsSeeder::class,

            // 5. Rules, conversions, schedules — needs users, accounts, campaigns.
            RulesSeeder::class,
        ]);
    }
}
