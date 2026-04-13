<?php

namespace App\Actions\Role;

use App\Enums\TeamRole;
use App\Models\Role;
use App\Models\TeamUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

class ListRolesAction
{
    /**
     * @return Collection<int, Role>
     */
    public function execute(): Collection
    {
        /** @var User $user */
        $user = Auth::user();

        $query = Role::query()->orderBy('name');

        if ($user->is_admin) {
            return $query->get();
        }

        // Start with the user's own allowed IDs (self + descendants + team leaders/members for managers).
        $allowedIds = $user->manageableUserIds();

        // If the user is a manager in any team, also include co-managers of those teams
        // so managers in the same team can see each other's roles.
        $managerTeamIds = TeamUser::query()
            ->where('user_id', $user->id)
            ->where('team_role', TeamRole::MANAGER->value)
            ->pluck('team_id')
            ->all();

        if ($managerTeamIds !== []) {
            $coManagerIds = TeamUser::query()
                ->whereIn('team_id', $managerTeamIds)
                ->where('team_role', TeamRole::MANAGER->value)
                ->pluck('user_id')
                ->all();

            $allowedIds = array_values(array_unique(array_merge($allowedIds, $coManagerIds)));
        }

        $query->where(function ($q) use ($allowedIds): void {
            $q->whereNull('created_by')
                ->orWhereIn('created_by', $allowedIds);
        });

        return $query->get();
    }
}
