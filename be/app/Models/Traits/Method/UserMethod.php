<?php

namespace App\Models\Traits\Method;

use App\Enums\Permission;
use App\Models\User;
use App\Models\UserParentChild;

/**
 * Trait UserMethod.
 */
trait UserMethod
{
    public function hasPermissionFlag(Permission $permission): bool
    {
        $this->loadMissing('role');
        $mask = $this->role?->getPermissionMask() ?? '0';

        return Permission::maskHasPermission($mask, $permission);
    }

    /**
     * Full role permissions → can manage any user (not restricted to own subtree).
     */
    public function managesAllUsers(): bool
    {
        return (bool) $this->is_full_access;
    }

    /**
     * Self plus every descendant user id (BFS). Used when the user is not a full-access admin.
     *
     * Loads the entire `user_parent_child` table once and traverses in memory
     * to avoid N+1 queries.
     *
     * @return list<int>
     */
    public function manageableUserIds(): array
    {
        // One query: fetch all parent→child pairs and build an adjacency map in memory.
        /** @var array<int, list<int>> $childrenOf */
        $childrenOf = [];
        UserParentChild::query()
            ->get(['parent_user_id', 'child_user_id'])
            ->each(function (UserParentChild $row) use (&$childrenOf): void {
                $childrenOf[(int) $row->parent_user_id][] = (int) $row->child_user_id;
            });

        // BFS over the in-memory map.
        $ids = [];
        $queue = [$this->id];

        while ($queue !== []) {
            $id = array_shift($queue);
            $ids[] = $id;
            foreach ($childrenOf[$id] ?? [] as $cid) {
                $queue[] = $cid;
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
     * Whether $descendantId sits strictly under $ancestorId in the `user_parent_child` chain.
     */
    public static function isDescendantOf(int $descendantId, int $ancestorId): bool
    {
        if ($descendantId === $ancestorId) {
            return false;
        }

        $current = UserParentChild::query()->where('child_user_id', $descendantId)->value('parent_user_id');
        $guard = 0;

        while ($current !== null && $guard < 1000) {
            if ((int) $current === $ancestorId) {
                return true;
            }
            $current = UserParentChild::query()->where('child_user_id', $current)->value('parent_user_id');
            $guard++;
        }

        return false;
    }

    /**
     * Assigning $newParentId as parent via `user_parent_child` would create a cycle (including self-parent).
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
