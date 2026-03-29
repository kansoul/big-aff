<?php

namespace App\Enums;

/**
 * Bit flags stored in `roles.permission_mask`. One case = one bit.
 * Middleware and API `permissions` use each case's name (e.g. `SettingsRolesView`); full access is `['*']`.
 */
enum Permission: int
{
    // —— Report ——
    case ReportOverviewView = 1 << 0;

    case ReportExport = 1 << 1;

    // —— Settings → Users ——
    case SettingsUsersView = 1 << 2;

    case SettingsUsersCreate = 1 << 3;

    case SettingsUsersUpdate = 1 << 4;

    case SettingsUsersDelete = 1 << 5;

    // —— Settings → Roles ——
    case SettingsRolesView = 1 << 6;

    case SettingsRolesCreate = 1 << 7;

    case SettingsRolesUpdate = 1 << 8;

    case SettingsRolesDelete = 1 << 9;

    case SettingsRolesAssign = 1 << 10;

    public static function tryFromName(string $name): ?self
    {
        foreach (self::cases() as $case) {
            if ($case->name === $name) {
                return $case;
            }
        }

        return null;
    }

    /**
     * @return array<string>
     */
    public static function names(): array
    {
        return array_map(fn (self $c) => $c->name, self::cases());
    }

    public static function fullMask(): int
    {
        $m = 0;
        foreach (self::cases() as $case) {
            $m |= $case->value;
        }

        return $m;
    }

    public static function maskHasFullAccess(int $mask): bool
    {
        return $mask !== 0 && ($mask & self::fullMask()) === self::fullMask();
    }

    /**
     * @return array<string>
     */
    public static function expandMaskToNames(int $mask): array
    {
        if (self::maskHasFullAccess($mask)) {
            return ['*'];
        }

        $out = [];
        foreach (self::cases() as $case) {
            if (($mask & $case->value) === $case->value) {
                $out[] = $case->name;
            }
        }

        return $out;
    }
}
