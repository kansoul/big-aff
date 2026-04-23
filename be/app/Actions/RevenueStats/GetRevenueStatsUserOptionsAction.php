<?php

namespace App\Actions\RevenueStats;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class GetRevenueStatsUserOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(Team $team): Collection
    {
        /** @var User $authUser */
        $authUser = Auth::user();

        $query = User::query()
            ->select(['users.id', 'users.name'])
            ->join('team_user', function ($join) use ($team) {
                $join->on('team_user.user_id', '=', 'users.id')
                    ->where('team_user.team_id', '=', $team->id);
            })
            ->orderBy('users.name')
            ->distinct();

        if ($authUser->is_admin) {
            return $query->get();
        }

        $currentRole = TeamUser::query()
            ->where('team_id', $team->id)
            ->where('user_id', $authUser->id)
            ->value('team_role');

        if ($currentRole === TeamRole::MANAGER->value) {
            return $query->get();
        }

        if ($currentRole !== TeamRole::LEADER->value) {
            return collect();
        }

        $ownership = OwnershipFilter::forAuthUser();
        $query->whereIn('users.id', $ownership->allowedUserIds());

        return $query->get();
    }
}
