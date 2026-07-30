<?php

namespace App\Enums;

enum AdsType: string
{
    case GOOGLE = 'google';
    case TIKTOK = 'tiktok';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
