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

            // 2. Sites graph: files, sites, user_sites — ads_links point at a site.
            SitesSeeder::class,

            // 3. Ads graph: accounts, campaigns, pixels, keyword sets, and ads_links.
            //    Must run before reports/tracking which reference campaign identifiers.
            AdsSeeder::class,

            // 4. Tracking events + raw clicks — needs real campaigns.
            TrackingSeeder::class,

            // 5. Daily / insight / revenue / campaign reports — needs ads + tracking data.
            ReportsSeeder::class,

            // 6. Rules, conversions, schedules — needs users, accounts, campaigns.
            RulesSeeder::class,

            // 7. Platform OAuth tokens (dummy values).
            IntegrationsSeeder::class,

            // 8. Fills owner_user_id / owner_main_team_id on the report tables.
            BackfillReportOwnersSeeder::class,
        ]);
    }
}
