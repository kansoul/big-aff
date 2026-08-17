<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\ClickTracking;
use App\Models\EventAdLoad;
use App\Models\EventClick;
use App\Models\EventView;
use App\Models\RealtimeReport;
use App\Models\TrackingSession;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;

/**
 * Seeds tracking events using campaign IDs from the ads graph.
 *   - session_id values are drawn from `tracking_sessions` seeded in this run.
 *   - `realtime_reports` is populated per (campaign_id, day) with totals in range.
 */
class TrackingSeeder extends Seeder
{
    private const SESSION_COUNT = 3;

    private const VIEW_COUNT = 3;

    private const CLICK_COUNT = 3;

    /** Number of past days covered by ad-load events and realtime reports. */
    private const EVENT_DAYS = 2;

    /** Ad-load events generated per day. */
    private const AD_LOADS_PER_DAY = 2;

    private const CLICK_TRACKING_COUNT = 3;

    public function run(): void
    {
        $campaigns = Campaign::query()->get(['campaign_id']);
        if ($campaigns->isEmpty()) {
            return;
        }

        $sessionIds = $this->seedTrackingSessions();

        $this->seedEventViews($campaigns, $sessionIds);
        $this->seedEventClicks($campaigns, $sessionIds);
        $this->seedEventAdLoads($campaigns, $sessionIds);
        $this->seedClickTracking($campaigns, $sessionIds);
        $this->seedRealtimeReports($campaigns);
    }

    /**
     * Raw click events (the source `revenue_reports.click_id` points at).
     *
     * @param  Collection<int, Campaign>  $campaigns
     * @param  array<int, string>  $sessionIds
     */
    private function seedClickTracking(Collection $campaigns, array $sessionIds): void
    {
        if (ClickTracking::query()->exists()) {
            return;
        }

        ClickTracking::factory()
            ->count(self::CLICK_TRACKING_COUNT)
            ->state(fn (): array => [
                'campaign_id' => $campaigns->random()->campaign_id,
                'session_id' => $sessionIds[array_rand($sessionIds)],
            ])
            ->create();
    }

    /**
     * @return array<int, string>
     */
    private function seedTrackingSessions(): array
    {
        if (TrackingSession::query()->count() < self::SESSION_COUNT) {
            $missing = self::SESSION_COUNT - TrackingSession::query()->count();
            TrackingSession::factory()->count($missing)->create();
        }

        return TrackingSession::query()->pluck('session_id')->all();
    }

    /**
     * @param  Collection<int, Campaign>  $campaigns
     * @param  array<int, string>  $sessionIds
     */
    private function seedEventViews(Collection $campaigns, array $sessionIds): void
    {
        if (EventView::query()->exists()) {
            return;
        }

        EventView::factory()
            ->count(self::VIEW_COUNT)
            ->state(function () use ($campaigns, $sessionIds): array {
                $campaign = $campaigns->random();

                return [
                    'campaign_id' => $campaign->campaign_id,
                    'session_id' => $sessionIds[array_rand($sessionIds)],
                ];
            })
            ->create();
    }

    /**
     * @param  Collection<int, Campaign>  $campaigns
     * @param  array<int, string>  $sessionIds
     */
    private function seedEventClicks(Collection $campaigns, array $sessionIds): void
    {
        if (EventClick::query()->exists()) {
            return;
        }

        EventClick::factory()
            ->count(self::CLICK_COUNT)
            ->state(function () use ($campaigns, $sessionIds): array {
                $campaign = $campaigns->random();

                return [
                    'campaign_id' => $campaign->campaign_id,
                    'session_id' => $sessionIds[array_rand($sessionIds)],
                ];
            })
            ->create();
    }

    /**
     * @param  Collection<int, Campaign>  $campaigns
     * @param  array<int, string>  $sessionIds
     */
    private function seedEventAdLoads(Collection $campaigns, array $sessionIds): void
    {
        if (EventAdLoad::query()->exists()) {
            return;
        }

        for ($day = self::EVENT_DAYS; $day >= 0; $day--) {
            $dayStart = Carbon::now()->subDays($day)->startOfDay();
            $total = self::AD_LOADS_PER_DAY;

            for ($i = 0; $i < $total; $i++) {
                $eventTime = $dayStart->copy()->addSeconds(fake()->numberBetween(0, 86399));
                $campaign = $campaigns->random();

                $isError = fake()->boolean(25);
                $isSearch = fake()->boolean(50);

                EventAdLoad::factory()
                    ->when($isError && $isSearch, fn ($f) => $f->errorSearch())
                    ->when($isError && ! $isSearch, fn ($f) => $f->errorArticle())
                    ->when(! $isError && $isSearch, fn ($f) => $f->successSearch())
                    ->when(! $isError && ! $isSearch, fn ($f) => $f->successArticle())
                    ->create([
                        'session_id' => $sessionIds[array_rand($sessionIds)],
                        'campaign_id' => $campaign->campaign_id,
                        'event_time' => $eventTime,
                        'created_at' => $eventTime,
                    ]);
            }
        }
    }

    /**
     * One realtime_report row per (campaign_id, day) so dashboards have daily totals.
     *
     * @param  Collection<int, Campaign>  $campaigns
     */
    private function seedRealtimeReports(Collection $campaigns): void
    {
        if (RealtimeReport::query()->exists()) {
            return;
        }

        foreach ($campaigns as $campaign) {
            for ($day = self::EVENT_DAYS; $day >= 0; $day--) {
                $date = Carbon::now()->subDays($day)->format('Y-m-d');

                RealtimeReport::query()->create([
                    'event_time' => $date,
                    'campaign_id' => $campaign->campaign_id,
                    'view_count' => fake()->numberBetween(0, 500),
                    'redirect_count' => fake()->numberBetween(0, 500),
                    'next_step_count' => fake()->numberBetween(0, 150),
                    'lead_count' => fake()->numberBetween(0, 150),
                ]);
            }
        }
    }
}
