<?php

namespace App\Models\Traits\Method;

trait UserTablePreferenceMethod
{
    public static function getForUser(int $userId, string $tableName): static
    {
        return static::firstOrCreate(
            ['user_id' => $userId, 'table_name' => $tableName],
            ['toggled_columns' => [], 'additional_settings' => []],
        );
    }
}
