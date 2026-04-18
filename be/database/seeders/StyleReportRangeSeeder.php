<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Models\RevenueChartReport;
use App\Models\RevenueReport;
use App\Models\Role;
use App\Models\Style;
use App\Models\User;
use App\Models\UserTablePreference;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds dummy data for the Style Report Range screen.
 *
 * What is created:
 *   - Admin + 2 manager users (reuses existing if present)
 *   - 5 styles (2 owned by manager1, 2 by manager2, 1 by admin)
 *   - RevenueChartReport rows at every 5-minute slot for the past 2 days
 *     with cumulative earnings that increase throughout the day
 *   - One RevenueReport per style (latest daily totals) to supply CPC
 *   - A UserTablePreference for the admin with a sample saved filter
 *
 * Suggested test ranges after seeding:
 *   - start: yesterday 08:00 → end: yesterday 12:00  (4h window)
 *   - start: today 00:00    → end: today <now-5m>    (full day so far)
 */
class StyleReportRangeSeeder extends Seeder
{
    /** How many days back to seed 5-min interval data for. */
    private const DAYS = 2;

    private const STYLES = [
        ['code' => 'style_abc001', 'name' => 'Blue Banner'],
        ['code' => 'style_def002', 'name' => 'Red Square'],
        ['code' => 'style_ghi003', 'name' => 'Green Leaderboard'],
        ['code' => 'style_jkl004', 'name' => 'Purple Skyscraper'],
        ['code' => 'style_mno005', 'name' => 'Orange Native'],
    ];

    /** Hourly traffic weight index 0–23 — controls the steepness of cumulative growth. */
    private const HOURLY_WEIGHT = [
        0.10, 0.08, 0.07, 0.06, 0.07, 0.10,
        0.20, 0.50, 0.85, 1.00, 0.95, 0.90,
        0.85, 0.80, 0.75, 0.70, 0.80, 0.95,
        1.00, 0.90, 0.80, 0.60, 0.40, 0.20,
    ];

    public function run(): void
    {
        $adminRole = $this->ensureAdminRole();
        $admin = $this->ensureAdmin($adminRole);

        $managerRole = $this->ensureManagerRole();
        [$manager1, $manager2] = $this->ensureManagers($managerRole);

        $styleOwners = [
            [self::STYLES[0], $manager1],
            [self::STYLES[1], $manager1],
            [self::STYLES[2], $manager2],
            [self::STYLES[3], $manager2],
            [self::STYLES[4], $admin],
        ];

        foreach ($styleOwners as [$styleDef, $owner]) {
            $style = $this->ensureStyle($styleDef, $owner);
            $this->seedFiveMinuteRows($style);
            $this->seedRevenueReport($style);
        }

        $this->seedAdminPreference($admin, array_column(self::STYLES, 'code'));
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
        $mask = Permission::StyleReportRangeView->bit()
            | Permission::RevenueReportsView->bit()
            | Permission::RevenueChartReportsView->bit();

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

    /**
     * Create 5-minute interval rows for the past N days.
     *
     * Each row's estimated_earnings is a cumulative running total within the day,
     * so subtracting start from end gives meaningful "real revenue" for any range.
     */
    private function seedFiveMinuteRows(Style $style): void
    {
        // Base daily earnings used to scale cumulative totals per day
        $baseDailyEarnings = fake()->randomFloat(2, 20.0, 150.0);
        $baseDailyClicks = fake()->numberBetween(200, 2000);

        for ($daysAgo = self::DAYS; $daysAgo >= 0; $daysAgo--) {
            $dayStart = Carbon::now()->subDays($daysAgo)->startOfDay();

            // Cumulative accumulators reset each day
            $cumulativeEarnings = 0.0;
            $cumulativeClicks = 0;

            for ($slot = 0; $slot < 288; $slot++) { // 288 = 24h * 60m / 5m
                $datetime = $dayStart->copy()->addMinutes($slot * 5);

                if ($datetime->isFuture()) {
                    break;
                }

                $exists = RevenueChartReport::where('style_code', $style->code)
                    ->where('datetime', $datetime)
                    ->exists();

                if ($exists) {
                    // Advance accumulators so subsequent new rows are consistent
                    $cumulativeEarnings += $this->slotEarningsDelta($slot, $baseDailyEarnings);
                    $cumulativeClicks += $this->slotClicksDelta($slot, $baseDailyClicks);

                    continue;
                }

                $earningsDelta = $this->slotEarningsDelta($slot, $baseDailyEarnings);
                $clicksDelta = $this->slotClicksDelta($slot, $baseDailyClicks);

                $cumulativeEarnings = round($cumulativeEarnings + $earningsDelta, 4);
                $cumulativeClicks += $clicksDelta;

                $cpc = $cumulativeClicks > 0 ? round($cumulativeEarnings / $cumulativeClicks, 4) : 0.0;
                $adRequests = (int) max(1, round($cumulativeClicks / fake()->randomFloat(3, 0.01, 0.06)));
                $impressions = (int) max(1, round($adRequests * fake()->randomFloat(2, 0.70, 0.95)));
                $pageViews = (int) max(1, round($adRequests * fake()->randomFloat(2, 0.90, 1.10)));

                RevenueChartReport::create([
                    'ad_client_id' => 'ca-pub-'.$style->code,
                    'style_code' => $style->code,
                    'style_name' => $style->name,
                    'channel_code' => 'chan_default',
                    'channel_name' => 'Default Channel',
                    'datetime' => $datetime,
                    'page_views' => $pageViews,
                    'clicks' => $cumulativeClicks,
                    'estimated_earnings' => $cumulativeEarnings,
                    'ad_requests' => $adRequests,
                    'impressions' => $impressions,
                    'ad_requests_rpm' => $adRequests > 0 ? round($cumulativeEarnings / $adRequests * 1000, 4) : 0.0,
                    'impressions_rpm' => $impressions > 0 ? round($cumulativeEarnings / $impressions * 1000, 4) : 0.0,
                    'cost_per_click' => $cpc,
                    'funnel_requests' => null,
                    'funnel_impressions' => null,
                    'funnel_clicks' => null,
                    'funnel_rpm' => null,
                ]);
            }
        }
    }

    /** Earnings increment for a given 5-minute slot index within the day. */
    private function slotEarningsDelta(int $slot, float $baseDailyEarnings): float
    {
        $hour = (int) ($slot * 5 / 60);
        $weight = self::HOURLY_WEIGHT[$hour] ?? 0.1;
        // Each 5-min slot is 1/12 of an hour; add jitter
        $delta = ($baseDailyEarnings / 288) * $weight * fake()->randomFloat(3, 0.5, 1.5);

        return max(0.0, $delta);
    }

    /** Clicks increment for a given 5-minute slot index within the day. */
    private function slotClicksDelta(int $slot, int $baseDailyClicks): int
    {
        $hour = (int) ($slot * 5 / 60);
        $weight = self::HOURLY_WEIGHT[$hour] ?? 0.1;
        $delta = ($baseDailyClicks / 288) * $weight * fake()->randomFloat(2, 0.5, 1.5);

        return (int) max(0, round($delta));
    }

    /** Create the latest RevenueReport entry (daily totals) to supply CPC on the frontend. */
    private function seedRevenueReport(Style $style): void
    {
        $today = Carbon::today()->toDateString();
        $exists = RevenueReport::where('style_code', $style->code)
            ->where('date', $today)
            ->exists();

        if ($exists) {
            return;
        }

        $clicks = fake()->numberBetween(200, 2000);
        $pageViews = (int) ($clicks / fake()->randomFloat(3, 0.01, 0.06));
        $earnings = round($clicks * fake()->randomFloat(2, 0.10, 0.50), 4);
        $cpc = $clicks > 0 ? round($earnings / $clicks, 4) : 0.0;
        $adRequests = (int) ($pageViews * fake()->randomFloat(2, 0.80, 1.10));
        $impressions = (int) ($adRequests * fake()->randomFloat(2, 0.70, 0.95));

        RevenueReport::create([
            'ad_client_id' => 'ca-pub-'.$style->code,
            'style_code' => $style->code,
            'style_name' => $style->name,
            'channel_code' => 'chan_default',
            'channel_name' => 'Default Channel',
            'date' => $today,
            'page_views' => $pageViews,
            'clicks' => $clicks,
            'estimated_earnings' => $earnings,
            'ad_requests' => $adRequests,
            'impressions' => $impressions,
            'ad_requests_rpm' => $adRequests > 0 ? round($earnings / $adRequests * 1000, 4) : 0.0,
            'impressions_rpm' => $impressions > 0 ? round($earnings / $impressions * 1000, 4) : 0.0,
            'cost_per_click' => $cpc,
            'funnel_requests' => null,
            'funnel_impressions' => null,
            'funnel_clicks' => null,
            'funnel_rpm' => null,
        ]);
    }

    /**
     * Save a sample filter preference for admin so the screen loads a saved state.
     *
     * @param  list<string>  $styleCodes
     */
    private function seedAdminPreference(User $admin, array $styleCodes): void
    {
        $yesterday = Carbon::yesterday()->format('Y-m-d');
        $now = Carbon::now();
        $endMinute = $now->minute - ($now->minute % 5);
        $endTime = $now->format('H').':'.sprintf('%02d', $endMinute);

        UserTablePreference::updateOrCreate(
            ['user_id' => $admin->id, 'table_name' => 'style-report-range'],
            [
                'toggled_columns' => [],
                'additional_settings' => [
                    'filters' => [
                        'ranges_filter' => [
                            'ranges' => [
                                [
                                    'start_date' => $yesterday,
                                    'start_time' => '08:00',
                                    'end_date' => $yesterday,
                                    'end_time' => '12:00',
                                    'style_codes' => array_slice($styleCodes, 0, 3),
                                ],
                                [
                                    'start_date' => Carbon::today()->format('Y-m-d'),
                                    'start_time' => '00:00',
                                    'end_date' => Carbon::today()->format('Y-m-d'),
                                    'end_time' => $endTime,
                                    'style_codes' => $styleCodes,
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        );
    }
}
