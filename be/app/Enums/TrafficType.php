<?php

namespace App\Enums;

enum TrafficType: string
{
    case GOOGLE = 'gg';
    case TIKTOK = 'tt';

    /**
     * Get the values of the enum.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
