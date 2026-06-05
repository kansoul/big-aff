<?php

namespace App\Jobs;

use App\Services\Integrations\Telegram\TelegramService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendTelegramAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected string $message,
        protected ?string $chatIdOverride = null,
        protected string $parseMode = 'Markdown',
    ) {
        $this->onQueue('warning');
    }

    public function handle(TelegramService $telegramService): void
    {
        $telegramService->sendMessage($this->message, $this->chatIdOverride, $this->parseMode);
    }
}
