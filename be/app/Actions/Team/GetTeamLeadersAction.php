<?php

namespace App\Actions\Team;

use App\Enums\TeamRole;
use App\Models\Team;
use Illuminate\Support\Collection;

class GetTeamLeadersAction
{
    public function execute(Team $team): Collection
    {
        return $team->users()
            ->wherePivot('team_role', TeamRole::LEADER->value)
            ->with(['children:id,name,email'])
            ->select(['users.id', 'users.name', 'users.email'])
            ->orderBy('users.name')
            ->get();
    }
}
