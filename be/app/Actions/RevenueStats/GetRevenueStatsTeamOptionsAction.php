<?php

namespace App\Actions\RevenueStats;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class GetRevenueStatsTeamOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(): Collection
    {
        /** @var User $authUser */
        $authUser = Auth::user();

        $query = Team::query()
            ->select(['id', 'name'])
            ->orderBy('name');

        if (! $authUser->is_admin) {
            $teamIds = TeamUser::query()
                ->where('user_id', $authUser->id)
                ->whereIn('team_role', [TeamRole::MANAGER->value, TeamRole::LEADER->value])
                ->pluck('team_id')
                ->all();

            $query->whereIn('id', $teamIds);
        }

        return $query->get();
    }
}
