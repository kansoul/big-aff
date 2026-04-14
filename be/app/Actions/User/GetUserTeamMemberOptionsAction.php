<?php

namespace App\Actions\User;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;
use App\Models\UserParentChild;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class GetUserTeamMemberOptionsAction
{
    /**
     * Return leaders and members in the given team, annotated with their current child-assignment status.
     *
     * @return Collection<int, array{id: int, name: string, email: string, team_role: string, is_assigned_child: bool}>
     */
    public function execute(Team $team): Collection
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = User::query()
            ->select(['users.id', 'users.name', 'users.email', 'team_user.team_role'])
            ->join('team_user', function ($join) use ($team) {
                $join->on('team_user.user_id', '=', 'users.id')
                    ->where('team_user.team_id', '=', $team->id)
                    ->whereIn('team_user.team_role', [TeamRole::LEADER->value, TeamRole::MEMBER->value]);
            })
            ->orderBy('users.name')
            ->orderBy('users.id');

        if (! $ownership->isAdmin()) {
            $query->whereIn('users.id', $ownership->allowedUserIds());
        }

        $assignedChildIds = UserParentChild::query()
            ->pluck('child_user_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return $query->get()->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'team_role' => $user->team_role,
            'is_assigned_child' => \in_array($user->id, $assignedChildIds, true),
        ]);
    }
}
