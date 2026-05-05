<?php

namespace App\Jobs;

use App\Actions\MainSystem\SendMainSystemChannelsAction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendMainSystemChannelsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;

    public int $tries = 3;

    public function handle(SendMainSystemChannelsAction $action): void
    {
        $action->execute();
    }

    public function failed(Throwable $exception): void
    {
        Log::channel('sync_reports')->error('[MainSystemSync] Failed to send channels', [
            'error' => $exception->getMessage(),
        ]);
    }
}
