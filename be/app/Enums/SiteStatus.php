<?php

namespace App\Enums;

enum SiteStatus: string
{
    case ACTIVE = 'active';
    case MAINTENANCE = 'maintenance';
    case SUSPENDED = 'suspended';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
