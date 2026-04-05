<?php

namespace App\Enums;

class DiskEnum
{
    const S3 = 's3';

    const PUBLIC = 'public';

    /**
     * Get the values of the enum.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return [
            self::S3,
            self::PUBLIC,
        ];
    }
}
