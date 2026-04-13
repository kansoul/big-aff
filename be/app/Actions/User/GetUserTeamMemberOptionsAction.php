<?php

namespace App\Actions\User;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\User;
use App\Models\UserParentChild;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class GetUserTeamMemberOptionsAction
{
    /**
     * Return leaders and members in the given team, annotated with their current child-assignment status.
     *
     * @return Collection<int, array{id: int, name: string, email: string, is_assigned_child: bool}>
     */
    public function execute(Team $team): Collection
    {
        $ownership = OwnershipFilter::forAuthUser();

        $teamMemberUserIds = TeamUser::query()
            ->where('team_id', $team->id)
            ->whereIn('team_role', [TeamRole::LEADER->value, TeamRole::MEMBER->value])
            ->select('user_id');

        $query = User::query()
            ->select(['id', 'name', 'email'])
            ->whereIn('id', $teamMemberUserIds)
            ->orderBy('name')
            ->orderBy('id');

        if (! $ownership->isAdmin()) {
            $query->whereIn('id', $ownership->allowedUserIds());
        }

        $assignedChildIds = UserParentChild::query()
            ->pluck('child_user_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return $query->get()->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_assigned_child' => \in_array($user->id, $assignedChildIds, true),
        ]);
    }
}
