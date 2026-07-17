<?php

namespace App\Services\Integrations\Telegram;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected string $botToken;

    protected string $chatId;

    public function __construct()
    {
        $this->botToken = config('services.telegram.bot_token');
        $this->chatId = config('services.telegram.chat_id');
    }

    /**
     * @param  ?string  $chatIdOverride  When set, sends to this chat instead of the default from config.
     * @param  string  $parseMode  Telegram parse_mode, e.g. HTML or Markdown.
     */
    public function sendMessage(string $message, ?string $chatIdOverride = null, string $parseMode = 'Markdown'): bool
    {
        $chatId = $chatIdOverride ?? $this->chatId;

        if (empty($this->botToken) || empty($chatId)) {
            Log::warning('Telegram bot token or chat ID is not configured.');

            return false;
        }

        try {
            $url = "https://api.telegram.org/bot{$this->botToken}/sendMessage";

            $response = Http::post($url, [
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => $parseMode,
            ]);

            if ($response->successful()) {
                return true;
            }

            Log::error('Failed to send Telegram message', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        } catch (\Exception $e) {
            Log::error('Error sending Telegram message', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
