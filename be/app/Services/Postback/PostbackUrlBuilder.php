<?php

namespace App\Services\Postback;

use App\Models\PixelConversion;

class PostbackUrlBuilder
{
    /**
     * Macros supported inside a postback URL template.
     *
     * @var array<int, string>
     */
    public const MACROS = [
        'click_id',
        'event_id',
        'event_name',
        'session_id',
        'campaign_id',
        'adset_id',
        'ad_id',
        'advertiser_id',
        'pixel_id',
        'platform',
        'tracking_code',
        'payout',
        'currency',
        'timestamp',
    ];

    /**
     * Replace {macro} placeholders in the template with values from the conversion.
     */
    public function build(string $template, PixelConversion $conversion): string
    {
        $values = [
            'click_id' => (string) ($conversion->click_id ?? ''),
            'event_id' => (string) ($conversion->event_id ?? ''),
            'event_name' => (string) ($conversion->event_name ?? ''),
            'session_id' => (string) ($conversion->session_id ?? ''),
            'campaign_id' => (string) ($conversion->campaign_id ?? ''),
            'adset_id' => (string) ($conversion->adset_id ?? ''),
            'ad_id' => (string) ($conversion->ad_id ?? ''),
            'advertiser_id' => (string) ($conversion->advertiser_id ?? ''),
            'pixel_id' => (string) ($conversion->pixel_id ?? ''),
            'platform' => (string) ($conversion->platform ?? ''),
            'tracking_code' => (string) ($conversion->tracking_code ?? ''),
            'payout' => $conversion->conversion_value !== null ? (string) $conversion->conversion_value : '',
            'currency' => (string) ($conversion->currency_code ?? ''),
            'timestamp' => (string) ($conversion->conversion_date_time?->timestamp ?? now()->timestamp),
        ];

        $replacements = [];
        foreach ($values as $macro => $value) {
            $replacements['{'.$macro.'}'] = rawurlencode($value);
        }

        return strtr($template, $replacements);
    }
}
