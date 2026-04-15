<?php

namespace App\Actions\Team;

use App\Models\User;
use Illuminate\Support\Collection;

class GetUserTeamOptionsAction
{
    /**
     * Return the teams a user belongs to, with their role in each team.
     *
     * @return Collection<int, array{id: int, name: string, team_role: string}>
     */
    public function execute(User $user): Collection
    {
        return $user->teams()
            ->select(['teams.id', 'teams.name'])
            ->orderBy('teams.name')
            ->get()
            ->map(fn($team) => [
                'id' => $team->id,
                'name' => $team->name,
                'team_role' => $team->pivot->team_role,
            ]);
    }
}
