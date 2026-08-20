<?php

namespace App\Enums;

enum PixelPlatform: string
{
    case FACEBOOK = 'facebook';
    case TIKTOK = 'tiktok';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
