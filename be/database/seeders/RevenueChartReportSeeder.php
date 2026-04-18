<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Models\RevenueChartReport;
use App\Models\Role;
use App\Models\Style;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds dummy data for the Revenue Chart Report (Style Real-time Chart) screen.
 *
 * Scenarios covered:
 *   - Admin user (full access, sees all styles)
 *   - Two manager users each owning their own styles
 *   - Hourly RevenueChartReport rows for the last 7 days per style
 *   - Traffic pattern: low at night, peaks in the morning and evening
 */
class RevenueChartReportSeeder extends Seeder
{
    /** How many days back to generate hourly data for. */
    private const DAYS = 7;

    private const STYLES = [
        ['code' => 'style_abc001', 'name' => 'Blue Banner'],
        ['code' => 'style_def002', 'name' => 'Red Square'],
        ['code' => 'style_ghi003', 'name' => 'Green Leaderboard'],
        ['code' => 'style_jkl004', 'name' => 'Purple Skyscraper'],
        ['code' => 'style_mno005', 'name' => 'Orange Native'],
    ];

    /** Base hourly multiplier (index = hour 0–23) to simulate realistic traffic patterns. */
    private const HOURLY_WEIGHT = [
        0.1, 0.08, 0.07, 0.06, 0.07, 0.1,   // 00–05 (night, low)
        0.2, 0.5, 0.85, 1.0, 0.95, 0.9,      // 06–11 (morning ramp-up)
        0.85, 0.8, 0.75, 0.7, 0.8, 0.95,     // 12–17 (afternoon)
        1.0, 0.9, 0.8, 0.6, 0.4, 0.2,        // 18–23 (evening peak then drop)
    ];

    public function run(): void
    {
        $adminRole = $this->ensureAdminRole();
        $admin = $this->ensureAdmin($adminRole);

        $managerRole = $this->ensureManagerRole();
        [$manager1, $manager2] = $this->ensureManagers($managerRole);

        // manager1 owns styles 0,1 — manager2 owns styles 2,3 — admin owns style 4
        $styleOwners = [
            [self::STYLES[0], $manager1],
            [self::STYLES[1], $manager1],
            [self::STYLES[2], $manager2],
            [self::STYLES[3], $manager2],
            [self::STYLES[4], $admin],
        ];

        foreach ($styleOwners as [$styleDef, $owner]) {
            $style = $this->ensureStyle($styleDef, $owner);
            $this->seedHourlyRows($style);
        }
    }

    // -------------------------------------------------------------------------

    private function ensureAdminRole(): Role
    {
        $role = Role::firstOrCreate(
            ['name' => 'admin'],
            ['permissions' => (string) Permission::fullMask()],
        );

        if (! $role->wasRecentlyCreated) {
            $role->update(['permissions' => (string) Permission::fullMask()]);
        }

        return $role;
    }

    private function ensureAdmin(Role $adminRole): User
    {
        return User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
            ],
        );
    }

    private function ensureManagerRole(): Role
    {
        $mask = Permission::RevenueReportsView->bit()
            | Permission::RevenueChartReportsView->bit()
            | Permission::RevenueStatsView->bit();

        return Role::firstOrCreate(
            ['name' => 'manager'],
            ['permissions' => (string) $mask],
        );
    }

    /**
     * @return array{0: User, 1: User}
     */
    private function ensureManagers(Role $role): array
    {
        $manager1 = User::firstOrCreate(
            ['email' => 'manager1@example.com'],
            [
                'name' => 'Manager One',
                'password' => Hash::make('password'),
                'role_id' => $role->id,
            ],
        );

        $manager2 = User::firstOrCreate(
            ['email' => 'manager2@example.com'],
            [
                'name' => 'Manager Two',
                'password' => Hash::make('password'),
                'role_id' => $role->id,
            ],
        );

        return [$manager1, $manager2];
    }

    /**
     * @param  array{code: string, name: string}  $styleDef
     */
    private function ensureStyle(array $styleDef, User $owner): Style
    {
        return Style::firstOrCreate(
            ['code' => $styleDef['code']],
            [
                'name' => $styleDef['name'],
                'created_by' => $owner->id,
            ],
        );
    }

    private function seedHourlyRows(Style $style): void
    {
        $basePageViews = fake()->numberBetween(500, 3000);
        $baseEarnings = fake()->randomFloat(2, 0.5, 5.0);

        for ($daysAgo = self::DAYS; $daysAgo >= 0; $daysAgo--) {
            for ($hour = 0; $hour < 24; $hour++) {
                $datetime = Carbon::now()
                    ->subDays($daysAgo)
                    ->startOfDay()
                    ->addHours($hour);

                // Skip future hours for today
                if ($datetime->isFuture()) {
                    continue;
                }

                $exists = RevenueChartReport::where('style_code', $style->code)
                    ->where('datetime', $datetime)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $weight = self::HOURLY_WEIGHT[$hour];
                $jitter = fake()->randomFloat(2, 0.85, 1.15);
                $effectiveWeight = $weight * $jitter;

                $pageViews = (int) max(1, round($basePageViews * $effectiveWeight));
                $clicks = (int) max(0, round($pageViews * fake()->randomFloat(3, 0.01, 0.06)));
                $adRequests = (int) max(1, round($pageViews * fake()->randomFloat(2, 0.8, 1.1)));
                $impressions = (int) max(1, round($adRequests * fake()->randomFloat(2, 0.7, 0.95)));
                $estimatedEarnings = round($baseEarnings * $effectiveWeight + fake()->randomFloat(4, -0.05, 0.05), 4);
                $estimatedEarnings = max(0.0, $estimatedEarnings);
                $cpc = $clicks > 0 ? round($estimatedEarnings / $clicks, 4) : 0.0;
                $adRequestsRpm = $adRequests > 0 ? round($estimatedEarnings / $adRequests * 1000, 4) : 0.0;
                $impressionsRpm = $impressions > 0 ? round($estimatedEarnings / $impressions * 1000, 4) : 0.0;

                $funnelRequests = fake()->boolean(70) ? (int) max(1, round($adRequests * 0.3 * $effectiveWeight)) : null;
                $funnelImpressions = $funnelRequests ? (int) max(1, round($funnelRequests * fake()->randomFloat(2, 0.6, 0.9))) : null;
                $funnelClicks = $funnelImpressions ? (int) max(0, round($funnelImpressions * fake()->randomFloat(3, 0.01, 0.05))) : null;
                $funnelRpm = ($funnelImpressions && $funnelImpressions > 0 && $estimatedEarnings > 0)
                    ? round($estimatedEarnings / $funnelImpressions * 1000, 4)
                    : null;

                RevenueChartReport::create([
                    'ad_client_id' => 'ca-pub-'.$style->code,
                    'style_code' => $style->code,
                    'style_name' => $style->name,
                    'channel_code' => 'chan_default',
                    'channel_name' => 'Default Channel',
                    'datetime' => $datetime,
                    'page_views' => $pageViews,
                    'clicks' => $clicks,
                    'estimated_earnings' => $estimatedEarnings,
                    'ad_requests' => $adRequests,
                    'impressions' => $impressions,
                    'ad_requests_rpm' => $adRequestsRpm,
                    'impressions_rpm' => $impressionsRpm,
                    'cost_per_click' => $cpc,
                    'funnel_requests' => $funnelRequests,
                    'funnel_impressions' => $funnelImpressions,
                    'funnel_clicks' => $funnelClicks,
                    'funnel_rpm' => $funnelRpm,
                ]);
            }
        }
    }
}
