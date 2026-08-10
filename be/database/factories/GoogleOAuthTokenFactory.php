<?php

namespace Database\Factories;

use App\Models\GoogleOAuthToken;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<GoogleOAuthToken>
 */
class GoogleOAuthTokenFactory extends Factory
{
    protected $model = GoogleOAuthToken::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $expiresIn = 3600;

        return [
            'access_token' => 'ya29.seed-'.Str::random(40),
            'refresh_token' => '1//seed-'.Str::random(40),
            'token_type' => 'Bearer',
            'expires_in' => $expiresIn,
            'expires_at' => Carbon::now()->addSeconds($expiresIn),
            'scope' => 'https://www.googleapis.com/auth/adwords',
            'is_active' => true,
        ];
    }

    public function expired(): static
    {
        return $this->state([
            'expires_at' => Carbon::now()->subHour(),
            'is_active' => false,
        ]);
    }
}
