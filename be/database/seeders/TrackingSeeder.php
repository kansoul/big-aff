<?php

namespace Database\Seeders;

use App\Models\EventAdLoad;
use App\Models\EventClick;
use App\Models\EventView;
use App\Models\LinkData;
use App\Models\RealtimeReport;
use App\Models\TrackingSession;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;

/**
 * Seeds the tracking-event tables. Every event is tied to a real `link_datas` row so
 * that `campaign_id`, `link_data_id`, and ad/adset identifiers stay consistent with the
 * ads graph produced by AdsSeeder.
 *
 *   - event_* rows inherit `campaign_id` from the link_data.
 *   - session_id values are drawn from `tracking_sessions` seeded in this run.
 *   - `realtime_reports` is populated per (link_data_id, day) with totals in range.
 */
class TrackingSeeder extends Seeder
{
    private const SESSION_COUNT = 200;

    private const VIEW_COUNT = 500;

    private const CLICK_COUNT = 300;

    public function run(): void
    {
        $linkData = LinkData::query()->get(['id', 'campaign_id']);
        if ($linkData->isEmpty()) {
            return;
        }

        $sessionIds = $this->seedTrackingSessions();

        $this->seedEventViews($linkData, $sessionIds);
        $this->seedEventClicks($linkData, $sessionIds);
        $this->seedEventAdLoads($linkData, $sessionIds);
        $this->seedRealtimeReports($linkData);
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
     * @param  Collection<int, LinkData>  $linkData
     * @param  array<int, string>  $sessionIds
     */
    private function seedEventViews(Collection $linkData, array $sessionIds): void
    {
        if (EventView::query()->exists()) {
            return;
        }

        EventView::factory()
            ->count(self::VIEW_COUNT)
            ->state(function () use ($linkData, $sessionIds): array {
                $link = $linkData->random();

                return [
                    'link_data_id' => $link->id,
                    'campaign_id' => $link->campaign_id,
                    'session_id' => $sessionIds[array_rand($sessionIds)],
                ];
            })
            ->create();
    }

    /**
     * @param  Collection<int, LinkData>  $linkData
     * @param  array<int, string>  $sessionIds
     */
    private function seedEventClicks(Collection $linkData, array $sessionIds): void
    {
        if (EventClick::query()->exists()) {
            return;
        }

        EventClick::factory()
            ->count(self::CLICK_COUNT)
            ->state(function () use ($linkData, $sessionIds): array {
                $link = $linkData->random();

                return [
                    'link_data_id' => $link->id,
                    'campaign_id' => $link->campaign_id,
                    'session_id' => $sessionIds[array_rand($sessionIds)],
                ];
            })
            ->create();
    }

    /**
     * @param  Collection<int, LinkData>  $linkData
     * @param  array<int, string>  $sessionIds
     */
    private function seedEventAdLoads(Collection $linkData, array $sessionIds): void
    {
        if (EventAdLoad::query()->exists()) {
            return;
        }

        for ($day = 14; $day >= 0; $day--) {
            $dayStart = Carbon::now()->subDays($day)->startOfDay();
            $total = fake()->numberBetween(30, 80);

            for ($i = 0; $i < $total; $i++) {
                $eventTime = $dayStart->copy()->addSeconds(fake()->numberBetween(0, 86399));
                $link = $linkData->random();

                $isError = fake()->boolean(25);
                $isSearch = fake()->boolean(50);

                EventAdLoad::factory()
                    ->when($isError && $isSearch, fn ($f) => $f->errorSearch())
                    ->when($isError && ! $isSearch, fn ($f) => $f->errorArticle())
                    ->when(! $isError && $isSearch, fn ($f) => $f->successSearch())
                    ->when(! $isError && ! $isSearch, fn ($f) => $f->successArticle())
                    ->create([
                        'session_id' => $sessionIds[array_rand($sessionIds)],
                        'link_data_id' => $link->id,
                        'campaign_id' => $link->campaign_id,
                        'event_time' => $eventTime,
                        'created_at' => $eventTime,
                    ]);
            }
        }
    }

    /**
     * One realtime_report row per (link_data_id, day) so dashboards have daily totals.
     *
     * @param  Collection<int, LinkData>  $linkData
     */
    private function seedRealtimeReports(Collection $linkData): void
    {
        if (RealtimeReport::query()->exists()) {
            return;
        }

        foreach ($linkData as $link) {
            for ($day = 29; $day >= 0; $day--) {
                $date = Carbon::now()->subDays($day)->format('Y-m-d');

                RealtimeReport::query()->create([
                    'event_time' => $date,
                    'link_data_id' => $link->id,
                    'view_article_count' => fake()->numberBetween(0, 500),
                    'view_search_count' => fake()->numberBetween(0, 500),
                    'click_keyword_count' => fake()->numberBetween(0, 150),
                    'click_ad_count' => fake()->numberBetween(0, 150),
                ]);
            }
        }
    }
}
