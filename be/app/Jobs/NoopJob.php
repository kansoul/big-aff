<?php

namespace App\Jobs;

use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NoopJob implements ShouldQueue
{
    use Batchable, Queueable;

    public function handle(): void {}
}
