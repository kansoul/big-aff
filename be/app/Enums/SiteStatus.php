<?php

namespace App\Enums;

enum SiteStatus: string
{
    case Active = 'active';
    case Maintenance = 'maintenance';
    case Suspended = 'suspended';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
