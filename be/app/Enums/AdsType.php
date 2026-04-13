<?php

namespace App\Enums;

enum AdsType: string
{
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
