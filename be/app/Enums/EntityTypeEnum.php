<?php

namespace App\Enums;

enum EntityTypeEnum: string
{
    case Campaign = 'campaign';
    case AdAdset = 'ad_adset';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
