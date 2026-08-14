<?php

namespace App\Enums;

enum AdsConversionType: string
{
    case TIKTOK = 'tiktok';
    case FACEBOOK = 'facebook';
    case GOOGLE = 'google';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
