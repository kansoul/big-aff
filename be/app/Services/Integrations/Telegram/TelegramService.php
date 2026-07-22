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
     *                                   Accepts a single chat ID or a comma-separated list (e.g. "123,456").
     * @param  string  $parseMode  Telegram parse_mode, e.g. HTML or Markdown.
     */
    public function sendMessage(string $message, ?string $chatIdOverride = null, string $parseMode = 'Markdown'): bool
    {
        $rawChatId = $chatIdOverride ?? $this->chatId;

        $chatIds = array_values(array_filter(
            array_map('trim', explode(',', (string) $rawChatId)),
            fn (string $chatId): bool => $chatId !== '',
        ));

        if (empty($this->botToken) || empty($chatIds)) {
            Log::warning('Telegram bot token or chat ID is not configured.');

            return false;
        }

        $allSucceeded = true;

        foreach ($chatIds as $chatId) {
            if (! $this->sendToChat($message, $chatId, $parseMode)) {
                $allSucceeded = false;
            }
        }

        return $allSucceeded;
    }

    /**
     * Send the message to a single chat ID.
     */
    private function sendToChat(string $message, string $chatId, string $parseMode): bool
    {
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
                'chat_id' => $chatId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        } catch (\Exception $e) {
            Log::error('Error sending Telegram message', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
