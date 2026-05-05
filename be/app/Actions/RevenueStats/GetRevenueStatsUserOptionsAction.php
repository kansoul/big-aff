<?php

namespace App\Actions\RevenueStats;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class GetRevenueStatsUserOptionsAction
{
    /**
     * @param  int[]|null  $teamIds
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(?array $teamIds): Collection
    {
        /** @var User $authUser */
        $authUser = Auth::user();

        if (empty($teamIds) && ! $authUser->managesAllUsers()) {
            return collect();
        }

        $query = User::query()
            ->select(['users.id', 'users.name'])
            ->join('team_user', 'team_user.user_id', '=', 'users.id')
            ->when(! empty($teamIds), fn ($q) => $q->whereIn('team_user.team_id', $teamIds))
            ->orderBy('users.name')
            ->distinct();

        if ($authUser->managesAllUsers()) {
            return $query->get();
        }

        // For non-managers, we need to check permissions per team or globally.
        // If teamIds is provided, we check if they have a sufficient role in ANY of those teams.
        $userRoles = TeamUser::query()
            ->where('user_id', $authUser->id)
            ->when(! empty($teamIds), fn ($q) => $q->whereIn('team_id', $teamIds))
            ->pluck('team_role', 'team_id');

        $canSeeAllInTeams = $userRoles->contains(fn ($role) => in_array($role, [TeamRole::MANAGER->value, TeamRole::LEADER->value], true));

        if (! $canSeeAllInTeams) {
            // If they are not a leader/manager in any of the requested teams, they can only see themselves or children.
            $query->whereIn('users.id', (new UserOwnerResource)->allowedUserIds());
        }

        return $query->get();
    }
}
