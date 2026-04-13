<?php

namespace App\Actions\Team;

use App\Enums\TeamRole;
use App\Models\Team;
use Illuminate\Support\Collection;

class GetTeamLeadersAction
{
    /**
     * @return Collection<int, array{id: int, name: string, email: string}>
     */
    public function execute(Team $team): Collection
    {
        return $team->users()
            ->wherePivot('team_role', TeamRole::LEADER->value)
            ->select(['users.id', 'users.name', 'users.email'])
            ->orderBy('users.name')
            ->get()
            ->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]);
    }
}
