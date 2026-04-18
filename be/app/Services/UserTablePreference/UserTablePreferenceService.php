<?php

namespace App\Services\UserTablePreference;

use App\Models\UserTablePreference;

class UserTablePreferenceService
{
    public function get(int $userId, string $tableName): UserTablePreference
    {
        return UserTablePreference::getForUser($userId, $tableName);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(int $userId, string $tableName, array $data): UserTablePreference
    {
        $preference = UserTablePreference::getForUser($userId, $tableName);

        if (array_key_exists('toggled_columns', $data)) {
            $preference->toggled_columns = $data['toggled_columns'];
        }

        if (array_key_exists('additional_settings', $data)) {
            $preference->additional_settings = array_merge(
                $preference->additional_settings ?? [],
                $data['additional_settings'],
            );
        }

        $preference->save();

        return $preference;
    }
}
