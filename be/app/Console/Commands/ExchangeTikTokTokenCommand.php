<?php

namespace App\Console\Commands;

use App\Actions\TikTok\ExchangeTikTokAuthorizationCodeAction;
use Illuminate\Console\Command;

class ExchangeTikTokTokenCommand extends Command
{
    protected $signature = 'tiktok:exchange-token {auth_code : Authorization code returned by TikTok Ads OAuth}';

    protected $description = 'Exchange a TikTok Ads authorization code for an access token.';

    public function handle(ExchangeTikTokAuthorizationCodeAction $exchangeTikTokAuthorizationCode): int
    {
        $token = $exchangeTikTokAuthorizationCode->execute((string) $this->argument('auth_code'));

        $this->info('TikTok Ads token connected successfully.');
        $this->line("Token ID: {$token->id}");
        $this->line('Advertiser IDs: '.(implode(', ', $token->advertiser_ids ?? []) ?: 'None returned'));

        return self::SUCCESS;
    }
}
