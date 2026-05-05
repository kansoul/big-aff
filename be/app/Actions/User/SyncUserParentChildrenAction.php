<?php

namespace App\Actions\User;

use App\Enums\TeamRole;
use App\Models\TeamUser;
use App\Models\User;
use App\Models\UserParentChild;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SyncUserParentChildrenAction
{
    /**
     * Replace the list of children assigned to the given parent user.
     *
     * Rules:
     *  - The parent must be a leader in a team (when assigning children).
     *  - Each child must be in the same team as the parent (leader or member role).
     *  - Passing null or an empty array removes all existing child links.
     *
     * @param  list<int>|null  $childIds
     *
     * @throws ValidationException
     */
    public function execute(User $parent, ?array $childIds): void
    {
        $resource = new UserOwnerResource;

        if (! $resource->isAdmin() && ! \in_array($parent->id, $resource->allowedUserIds(), true)) {
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
            $this->validateParentIsLeaderAndChildrenInSameTeam($parent, $childIds, $resource);
        }

        DB::transaction(function () use ($parent, $childIds): void {
            UserParentChild::query()->where('parent_user_id', $parent->id)->delete();

            if ($childIds !== []) {
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

    /**
     * @param  list<int>  $childIds
     *
     * @throws ValidationException
     */
    private function validateParentIsLeaderAndChildrenInSameTeam(
        User $parent,
        array $childIds,
        UserOwnerResource $resource,
    ): void {
        $parentMembership = TeamUser::query()
            ->where('user_id', $parent->id)
            ->where('team_role', TeamRole::LEADER->value)
            ->first(['team_id']);

        if ($parentMembership === null) {
            throw ValidationException::withMessages([
                'parent' => [__('The parent user must be a leader in a team.')],
            ]);
        }

        $teamId = (int) $parentMembership->team_id;
        $allowedIds = $resource->isAdmin() ? null : $resource->allowedUserIds();

        $validChildIds = TeamUser::query()
            ->where('team_id', $teamId)
            ->whereIn('user_id', $childIds)
            ->whereIn('team_role', [TeamRole::LEADER->value, TeamRole::MEMBER->value])
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        foreach ($childIds as $childId) {
            if ($allowedIds !== null && ! \in_array($childId, $allowedIds, true)) {
                throw ValidationException::withMessages([
                    'child_ids' => [__('Invalid child user.')],
                ]);
            }

            if (! \in_array($childId, $validChildIds, true)) {
                throw ValidationException::withMessages([
                    'child_ids' => [__('All child users must be in the same team as the parent leader.')],
                ]);
            }
        }
    }
}
