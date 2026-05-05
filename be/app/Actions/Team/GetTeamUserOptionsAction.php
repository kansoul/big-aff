<?php

namespace App\Actions\Team;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Support\Collection;

class GetTeamUserOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string, email: string}>
     */
    public function execute(Team $team): Collection
    {
        $resource = new UserOwnerResource;

        $assignedUserIds = $team->users()->pluck('users.id');

        // Users already in another team as leader/member cannot be assigned again.
        $occupiedUserIds = TeamUser::query()
            ->whereNotIn('team_id', [$team->id])
            ->whereIn('team_role', [TeamRole::LEADER->value, TeamRole::MEMBER->value])
            ->pluck('user_id');

        $query = User::query()
            ->select(['id', 'name', 'email'])
            ->whereNotIn('id', $assignedUserIds)
            ->whereNotIn('id', $occupiedUserIds)
            ->orderBy('id');

        if (! $resource->isAdmin()) {
            $query->whereIn('created_by', $resource->allowedUserIds());
        }

        return $query->get();
    }
}
