<?php

namespace App\Enums;

enum RuleActionMode: string
{
    case PAUSE = 'pause';
    case WARNING = 'warning';

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
