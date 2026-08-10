<?php

namespace Database\Factories;

use App\Models\TikTokOAuthToken;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<TikTokOAuthToken>
 */
class TikTokOAuthTokenFactory extends Factory
{
    protected $model = TikTokOAuthToken::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $expiresIn = 86_400;
        $refreshExpiresIn = 31_536_000;
        $advertiserId = fake()->numerify('###################');

        return [
            'access_token' => 'seed-act-'.Str::random(40),
            'refresh_token' => 'seed-rft-'.Str::random(40),
            'token_type' => 'Bearer',
            'expires_in' => $expiresIn,
            'expires_at' => Carbon::now()->addSeconds($expiresIn),
            'refresh_token_expires_in' => $refreshExpiresIn,
            'refresh_token_expires_at' => Carbon::now()->addSeconds($refreshExpiresIn),
            'scope' => 'ad.group.operate,advertiser.read,report.read',
            'advertiser_ids' => [$advertiserId],
            'creator_id' => fake()->numerify('###################'),
            'raw_response' => ['code' => 0, 'message' => 'OK'],
            'is_active' => true,
        ];
    }

    public function expired(): static
    {
        return $this->state([
            'expires_at' => Carbon::now()->subDay(),
            'is_active' => false,
        ]);
    }
}
