<?php

namespace App\Services\User;

use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserParentChildService
{
    public function __construct(
        private readonly UserService $userService
    ) {}

    /**
     * @return array{
     *     assignments: list<array{id: int, name: string, email: string, can_be_parent: true, child_user_ids: list<int>}>,
     *     user_options: list<array{id: int, name: string, email: string, is_assigned_child: bool}>
     * }
     */
    public function listAssignmentsForActor(User $actor): array
    {
        $users = $this->userService->listForActor($actor);

        $rows = UserParentChild::query()
            ->select('parent_user_id', 'child_user_id')
            ->get();

        /** @var array<int, list<int>> $byParent */
        $byParent = [];
        foreach ($rows as $row) {
            $pid = (int) $row->parent_user_id;
            $cid = (int) $row->child_user_id;
            $byParent[$pid] ??= [];
            $byParent[$pid][] = $cid;
        }

        /** @var list<int> $childIdsSet */
        $childIdsSet = $rows->pluck('child_user_id')->map(fn($id) => (int) $id)->all();

        $userOptions = $users->map(function (User $user) use ($childIdsSet): array {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_assigned_child' => in_array($user->id, $childIdsSet, true),
            ];
        })->values()->all();

        $assignments = $users
            ->filter(fn(User $user) => ! in_array($user->id, $childIdsSet, true))
            ->map(function (User $user) use ($byParent): array {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'can_be_parent' => true,
                    'child_user_ids' => array_values($byParent[$user->id] ?? []),
                ];
            })
            ->values()
            ->all();

        return [
            'assignments' => $assignments,
            'user_options' => $userOptions,
        ];
    }

    /**
     * @param  list<int>  $childIds
     */
    public function syncChildren(User $actor, User $parent, array $childIds): void
    {
        if ($parent->isAssignedChildInParentChildTable()) {
            throw ValidationException::withMessages([
                'child_ids' => [__('This user is already assigned as a child and cannot have children.')],
            ]);
        }

        if (! $actor->canManageUser($parent)) {
            throw ValidationException::withMessages([
                'parent' => [__('You cannot change assignments for this user.')],
            ]);
        }

        $childIds = array_values(array_unique(array_map(intval(...), $childIds)));

        foreach ($childIds as $childId) {
            if ($childId === $parent->id) {
                throw ValidationException::withMessages([
                    'child_ids' => [__('A user cannot be assigned as their own child.')],
                ]);
            }
        }

        foreach ($childIds as $childId) {
            $target = User::query()->whereKey($childId)->first();
            if ($target === null || ! $actor->canManageUser($target)) {
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
