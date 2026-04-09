<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Style;
use App\Models\User;

class StylePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionFlag(Permission::StylesView);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionFlag(Permission::StylesCreate);
    }

    public function delete(User $user, Style $style): bool
    {
        return $user->hasPermissionFlag(Permission::StylesDelete);
    }
}
