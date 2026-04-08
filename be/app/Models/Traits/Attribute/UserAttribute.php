<?php

namespace App\Models\Traits\Attribute;

use App\Enums\Permission;
use Illuminate\Database\Eloquent\Casts\Attribute;

/**
 * Trait UserAttribute.
 */
trait UserAttribute
{
    protected function isFullAccess(): Attribute
    {
        return Attribute::make(
            get: function (): bool {
                $this->loadMissing('role');
                $mask = $this->role?->getPermissionMask() ?? '0';

                return Permission::hasFullAccess($mask);
            }
        );
    }

    protected function isAdmin(): Attribute
    {
        return Attribute::make(
            get: function (): bool {
                $this->loadMissing('role');
                $mask = $this->role?->permissions ?? '0';

                return $mask === Permission::FULL_ACCESS_SENTINEL;
            }
        );
    }
}
