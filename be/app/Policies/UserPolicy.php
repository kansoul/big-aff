<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionFlag(Permission::SettingsUsersView);
    }

    public function view(User $user, User $model): bool
    {
        if (! $user->hasPermissionFlag(Permission::SettingsUsersView)) {
            return false;
        }

        return $user->canManageUser($model);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionFlag(Permission::SettingsUsersCreate);
    }

    public function update(User $user, User $model): bool
    {
        if (! $user->hasPermissionFlag(Permission::SettingsUsersUpdate)) {
            return false;
        }

        return $user->canManageUser($model);
    }

    public function delete(User $user, User $model): bool
    {
        if (! $user->hasPermissionFlag(Permission::SettingsUsersDelete)) {
            return false;
        }

        if ($model->id === $user->id) {
            return false;
        }

        return $user->canManageUser($model);
    }
}
