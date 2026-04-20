<?php

namespace Database\Factories;

use App\Models\TrackingSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TrackingSession>
 */
class TrackingSessionFactory extends Factory
{
    protected $model = TrackingSession::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'session_id' => fake()->uuid(),
            'ip_address' => fake()->ipv4(),
            'device' => fake()->optional(0.7)->randomElement(['desktop', 'mobile', 'tablet']),
            'browser' => fake()->optional(0.8)->randomElement(['chrome', 'safari', 'firefox', 'edge']),
            'country' => fake()->optional(0.8)->countryCode(),
            'referrer' => fake()->optional(0.6)->url(),
            'user_agent' => fake()->optional(0.8)->userAgent(),
            'is_bot' => fake()->boolean(5),
        ];
    }
}
