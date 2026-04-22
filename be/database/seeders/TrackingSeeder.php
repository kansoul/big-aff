<?php

namespace Database\Seeders;

use App\Models\EventAdLoad;
use App\Models\EventClick;
use App\Models\EventView;
use App\Models\LinkData;
use App\Models\TrackingSession;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class TrackingSeeder extends Seeder
{
    public function run(): void
    {
        if (! TrackingSession::query()->exists()) {
            TrackingSession::factory()->count(200)->create();
        }

        $linkDataIds = LinkData::query()->limit(200)->pluck('id')->all();
        if (! count($linkDataIds)) {
            return;
        }

        if (! EventView::query()->exists()) {
            EventView::factory()
                ->count(500)
                ->state(fn () => [
                    'link_data_id' => fake()->randomElement($linkDataIds),
                    'campaign_id' => null,
                ])
                ->create();
        }

        if (! EventClick::query()->exists()) {
            EventClick::factory()
                ->count(300)
                ->state(fn () => [
                    'link_data_id' => fake()->randomElement($linkDataIds),
                    'campaign_id' => null,
                ])
                ->create();
        }

        if (! EventAdLoad::query()->exists()) {
            for ($day = 14; $day >= 0; $day--) {
                $dayStart = Carbon::now()->subDays($day)->startOfDay();
                $total = fake()->numberBetween(30, 80);

                for ($i = 0; $i < $total; $i++) {
                    $eventTime = $dayStart->copy()->addSeconds(fake()->numberBetween(0, 86399));

                    $linkDataId = fake()->randomElement($linkDataIds);

                    $isError = fake()->boolean(25);
                    $isSearch = fake()->boolean(50);

                    EventAdLoad::factory()
                        ->when($isError && $isSearch, fn ($f) => $f->errorSearch())
                        ->when($isError && ! $isSearch, fn ($f) => $f->errorArticle())
                        ->when(! $isError && $isSearch, fn ($f) => $f->successSearch())
                        ->when(! $isError && ! $isSearch, fn ($f) => $f->successArticle())
                        ->create([
                            'link_data_id' => $linkDataId,
                            'event_time' => $eventTime,
                            'created_at' => $eventTime,
                        ]);
                }
            }
        }
    }
}
