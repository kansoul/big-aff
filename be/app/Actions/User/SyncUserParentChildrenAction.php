<?php

namespace App\Actions\User;

use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SyncUserParentChildrenAction
{
    /**
     * @param  list<int>|null  $childIds  When null or empty, the user is no longer a parent (all child links removed).
     */
    public function execute(User $parent, ?array $childIds): void
    {
        /** @var User $user */
        $user = Auth::user();

        if ($parent->isAssignedChildInParentChildTable()) {
            throw ValidationException::withMessages([
                'child_ids' => [__('This user is already assigned as a child and cannot have children.')],
            ]);
        }

        if (! $user->canManageUser($parent)) {
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

        foreach ($childIds as $childId) {
            $target = User::query()->whereKey($childId)->first();
            if ($target === null || ! $user->canManageUser($target)) {
                throw ValidationException::withMessages([
                    'child_ids' => [__('Invalid child user.')],
                ]);
            }

            if ($target->isAssignedParentInParentChildTable()) {
                throw ValidationException::withMessages([
                    'child_ids' => [__('A user who already has assigned children cannot become a child. Remove their children first.')],
                ]);
            }
        }

        DB::transaction(function () use ($parent, $childIds): void {
            UserParentChild::query()->where('parent_user_id', $parent->id)->delete();

            foreach ($childIds as $childId) {
                UserParentChild::query()->where('child_user_id', $childId)->delete();
            }

            foreach ($childIds as $childId) {
                UserParentChild::query()->create([
                    'parent_user_id' => $parent->id,
                    'child_user_id' => $childId,
                ]);
            }
        });
    }
}
