<?php

namespace Database\Factories;

use App\Models\PixelConversion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PixelConversion> */
class PixelConversionFactory extends Factory
{
    protected $model = PixelConversion::class;

    public function definition(): array
    {
        $conversionDateTime = fake()->dateTimeBetween('-3 days', 'now');

        return [
            'ads_link_id' => null,
            'tracking_code' => null,
            'platform' => 'tiktok',
            'advertiser_id' => fake()->numerify('###################'),
            'pixel_id' => strtoupper(fake()->bothify('C##################')),
            'event_name' => fake()->randomElement(['CompletePayment', 'SubmitForm', 'Contact']),
            'event_id' => (string) fake()->uuid(),
            'session_id' => null,
            'campaign_id' => null,
            'adset_id' => fake()->numerify('###################'),
            'ad_id' => fake()->numerify('###################'),
            'click_id' => strtoupper(fake()->bothify('TTCLID??????????????')),
            'conversion_value' => fake()->randomFloat(2, 1, 200),
            'currency_code' => 'USD',
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'payload' => ['source' => 'seeder'],
            'conversion_date_time' => $conversionDateTime,
            'postback_url' => null,
            'postback_attempts' => 0,
            'postback_status' => null,
            'postback_response' => null,
            'postback_sent_at' => null,
        ];
    }

    /**
     * Postback delivered successfully on the first attempt.
     */
    public function postbackSent(): self
    {
        return $this->state(fn (array $attributes): array => [
            'postback_attempts' => 1,
            'postback_status' => 200,
            'postback_response' => 'OK',
            'postback_sent_at' => $attributes['conversion_date_time'],
        ]);
    }

    /**
     * Postback exhausted its retries and never landed.
     */
    public function postbackFailed(): self
    {
        return $this->state(fn (): array => [
            'postback_attempts' => 3,
            'postback_status' => 500,
            'postback_response' => 'Postback returned HTTP 500',
            'postback_sent_at' => null,
        ]);
    }

    /**
     * Conversion stored but no postback URL configured on the ads link.
     */
    public function withoutPostback(): self
    {
        return $this->state(fn (): array => [
            'postback_url' => null,
            'postback_attempts' => 0,
            'postback_status' => null,
            'postback_response' => null,
            'postback_sent_at' => null,
        ]);
    }

    public function meta(): self
    {
        return $this->state(fn (): array => [
            'platform' => 'meta',
            'event_name' => 'Purchase',
            'click_id' => 'fb.1.'.fake()->numerify('##########').'.'.fake()->numerify('##########'),
        ]);
    }
}
