<?php

namespace App\Enums;

enum TeamRole: string
{
    case MANAGER = 'manager';
    case LEADER = 'leader';
    case MEMBER = 'member';

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
