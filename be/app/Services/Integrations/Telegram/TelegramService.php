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
            Log::channel('rule_tracking')->warning('[Telegram] Not sent: bot token or chat ID is not configured', [
                'has_bot_token' => ! empty($this->botToken),
                'chat_id' => $chatId ?: '(empty)',
                'used_override' => $chatIdOverride !== null,
            ]);

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
                Log::channel('rule_tracking')->info('[Telegram] Message sent', [
                    'chat_id' => $chatId,
                ]);

                return true;
            }

            Log::channel('rule_tracking')->error('[Telegram] Failed to send message', [
                'chat_id' => $chatId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        } catch (\Exception $e) {
            Log::channel('rule_tracking')->error('[Telegram] Error sending message', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
