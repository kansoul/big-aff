<?php

namespace App\Actions\User;

use App\Models\User;
use App\Models\UserParentChild;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SyncUserParentChildrenAction
{
    /**
     * @param  list<int>|null  $childIds  When null or empty, the user is no longer a parent (all child links removed).
     */
    public function execute(User $parent, ?array $childIds): void
    {
        $ownership = OwnershipFilter::forAuthUser();

        // Auth user must be allowed to manage the parent user.
        if (! $ownership->isAdmin() && ! \in_array($parent->id, $ownership->allowedUserIds(), true)) {
            throw ValidationException::withMessages([
                'parent' => [__('You cannot change assignments for this user.')],
            ]);
        }

        $childIds = array_values(array_unique(array_map(intval(...), $childIds ?? [])));

        foreach ($childIds as $childId) {
            if ($childId === $parent->id) {
                throw ValidationException::withMessages([
                    'child_ids' => [__('A user cannot be assigned as their own child.')],
                ]);
            }
        }

        if ($childIds !== []) {
            $allowedIds = $ownership->isAdmin() ? null : $ownership->allowedUserIds();

            // Bulk-load all target users in one query to avoid N+1.
            $foundIds = User::query()
                ->whereIn('id', $childIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            foreach ($childIds as $childId) {
                if (! \in_array($childId, $foundIds, true)
                    || ($allowedIds !== null && ! \in_array($childId, $allowedIds, true))) {
                    throw ValidationException::withMessages([
                        'child_ids' => [__('Invalid child user.')],
                    ]);
                }
            }
        }

        DB::transaction(function () use ($parent, $childIds): void {
            // Remove all existing children of this parent in one query.
            UserParentChild::query()->where('parent_user_id', $parent->id)->delete();

            if ($childIds !== []) {
                // Remove any existing parent links for the new children in one query.
                UserParentChild::query()->whereIn('child_user_id', $childIds)->delete();

                // Bulk insert instead of one INSERT per child.
                $now = now();
                UserParentChild::insert(
                    array_map(fn (int $childId) => [
                        'parent_user_id' => $parent->id,
                        'child_user_id' => $childId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ], $childIds)
                );
            }
        });
    }
}
