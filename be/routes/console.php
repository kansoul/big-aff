<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Flush Redis-buffered tracking counts into tracking_daily every minute.
// withoutOverlapping() prevents stacking if a flush takes longer than 60 s.
// onOneServer() ensures only one instance runs across horizontally scaled workers.
// Skip on minutes divisible by 5 — those flushes are handled inside reports:sync-all
// so that realtime data is written to DB before campaign report aggregation.
Schedule::command('tracking:flush-daily')
    ->everyMinute()
    ->when(fn () => now()->minute % 5 !== 0)
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

Schedule::command('adx:flush-realtime')
    ->everyMinute()
    ->when(fn () => now()->minute % 5 !== 0)
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

// Nightly reconciliation at 02:00 AM — re-aggregates yesterday's raw event data
// and overwrites tracking_daily to fix any drift from Redis drops or queue errors.
Schedule::command('tracking:reconcile')
    ->dailyAt('02:00')
    ->withoutOverlapping()
    ->onOneServer();

Schedule::command('reports:sync-all')
    ->everyFiveMinutes()
    ->name('sync-all-reports')
    ->withoutOverlapping(15);

Schedule::command('adx:sync-reports')
    ->everyFiveMinutes()
    ->name('sync-adx-reports')
    ->withoutOverlapping(15);

Schedule::command('reports:fetch-ads-adsets-by-facebook')
    ->everyFiveMinutes()
    ->name('fetch-ads-adsets-by-facebook')
    ->withoutOverlapping(20);

Schedule::command('campaigns:run-schedules')
    ->name('run-campaign-schedules')
    ->withoutOverlapping(30)
    ->everyFiveMinutes();

Schedule::command('google-ads:sync-conversions')
    ->hourly()
    ->name('sync-google-conversions')
    ->withoutOverlapping(30);

Schedule::command('adx:sync-conversions')
    ->hourly()
    ->name('sync-adx-conversions')
    ->withoutOverlapping(30);
