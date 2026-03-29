<?php

namespace App\Enums;

class RoleEnum
{
    const ADMIN = 'admin';

    const USER = 'user';

    const EDITOR = 'editor';

    const MANAGE = 'manage';

    /**
     * Get the values of the enum.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return [
            self::ADMIN,
            self::USER,
            self::EDITOR,
            self::MANAGE,
        ];
    }
}
