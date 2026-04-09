<?php

namespace App\Models\Traits\Attribute;

use App\Enums\Permission;
use App\Models\User;
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

    /**
     * Get the list of child user IDs.
     * If the user is an admin, returns all user IDs except itself; otherwise returns child IDs via `user_parent_child`.
     *
     * @return Attribute<array<int>, never>
     */
    protected function childUserIds(): Attribute
    {
        return Attribute::make(
            get: function (): array {
                if ($this->is_admin) {
                    return User::where('id', '!=', $this->id)->pluck('id')->toArray();
                }

                $this->loadMissing('children');

                return $this->children->pluck('id')->toArray();
            }
        );
    }
}
