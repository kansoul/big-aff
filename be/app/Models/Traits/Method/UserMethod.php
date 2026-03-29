<?php

namespace App\Models\Traits\Method;

use App\Enums\Permission;

/**
 * Trait UserMethod.
 */
trait UserMethod
{
    public function hasPermissionFlag(Permission $permission): bool
    {
        $this->loadMissing('role');
        $mask = (int) ($this->role?->permission_mask ?? 0);

        if (Permission::maskHasFullAccess($mask)) {
            return true;
        }

        return ($mask & $permission->value) === $permission->value;
    }
}
