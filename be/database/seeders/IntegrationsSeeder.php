<?php

namespace Database\Seeders;

use App\Models\GoogleOAuthToken;
use App\Models\TikTokOAuthToken;
use Illuminate\Database\Seeder;

/**
 * Seeds the platform OAuth token tables with one active (dummy) token each so the
 * integration screens have a row to render. The tokens are fake strings — they cannot
 * be used against the real Google / TikTok APIs.
 */
class IntegrationsSeeder extends Seeder
{
    public function run(): void
    {
        if (! GoogleOAuthToken::query()->exists()) {
            GoogleOAuthToken::factory()->create();
        }

        if (! TikTokOAuthToken::query()->exists()) {
            TikTokOAuthToken::factory()->create();
        }
    }
}
