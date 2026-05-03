<?php

namespace App\Jobs;

use App\Services\Integrations\Telegram\TelegramService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendTelegramWarningJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of seconds after which the job's unique lock will be released.
     *
     * @var int
     */
    public $uniqueFor = 600;

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected string $message,
        protected string $campaignId,
        protected string $adsLinkId = '',
        protected ?string $chatIdOverride = null,
        protected string $parseMode = 'Markdown',
    ) {
        $this->onQueue('warning');
    }

    /**
     * The unique ID of the job.
     */
    public function uniqueId(): string
    {
        return $this->campaignId . '-' . $this->adsLinkId;
    }

    /**
     * Execute the job.
     */
    public function handle(TelegramService $telegramService): void
    {
        $telegramService->sendMessage($this->message, $this->chatIdOverride, $this->parseMode);
    }
}
