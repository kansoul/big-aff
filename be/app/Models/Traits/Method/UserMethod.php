<?php

namespace App\Models\Traits\Method;

use App\Enums\Permission;
use App\Models\User;

/**
 * Trait UserMethod.
 */
trait UserMethod
{
    public function hasPermissionFlag(Permission $permission): bool
    {
        $this->loadMissing('role');
        $mask = (int) ($this->role?->permission_mask ?? 0);

        return Permission::maskHasPermission($mask, $permission);
    }

    /**
     * Full role mask → can manage any user (not restricted to own subtree).
     */
    public function managesAllUsers(): bool
    {
        $this->loadMissing('role');
        $mask = (int) ($this->role?->permission_mask ?? 0);

        return Permission::maskHasFullAccess($mask);
    }

    /**
     * Self plus every descendant user id (BFS). Used when the user is not a full-access admin.
     *
     * @return list<int>
     */
    public function manageableUserIds(): array
    {
        $ids = [];
        $queue = [$this->id];

        while ($queue !== []) {
            $id = array_shift($queue);
            $ids[] = $id;
            $childIds = User::query()->where('parent_id', $id)->pluck('id')->all();
            foreach ($childIds as $cid) {
                $queue[] = (int) $cid;
            }
        }

        return $ids;
    }

    public function canManageUser(User $target): bool
    {
        if ($this->managesAllUsers()) {
            return true;
        }

        return in_array($target->id, $this->manageableUserIds(), true);
    }

    /**
     * Whether $descendantId sits strictly under $ancestorId in the parent chain.
     */
    public static function isDescendantOf(int $descendantId, int $ancestorId): bool
    {
        if ($descendantId === $ancestorId) {
            return false;
        }

        $current = User::query()->whereKey($descendantId)->value('parent_id');
        $guard = 0;

        while ($current !== null && $guard < 1000) {
            if ((int) $current === $ancestorId) {
                return true;
            }
            $current = User::query()->whereKey($current)->value('parent_id');
            $guard++;
        }

        return false;
    }

    /**
     * Setting $user->parent_id to $newParentId would create a cycle (including self-parent).
     */
    public static function assigningParentWouldCycle(User $user, ?int $newParentId): bool
    {
        if ($newParentId === null) {
            return false;
        }

        if ($newParentId === $user->id) {
            return true;
        }

        return self::isDescendantOf($newParentId, $user->id);
    }

    /** This user appears as `child_user_id` in `user_parent_child`. */
    public function isAssignedChildInParentChildTable(): bool
    {
        return $this->assignedParentLink()->exists();
    }

    /** This user has at least one row as `parent_user_id` in `user_parent_child`. */
    public function isAssignedParentInParentChildTable(): bool
    {
        return $this->assignedChildrenLinks()->exists();
    }
}
