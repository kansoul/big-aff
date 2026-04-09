<?php

namespace App\Enums;

enum PostType: string
{
    case NORMAL = 'normal';
    case AI = 'ai';
    case WORDPRESS = 'wordpress';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
