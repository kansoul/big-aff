<?php

namespace App\Actions\Team;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamUser;
use App\Support\OwnerResource\TeamOwnerResource;
use Illuminate\Support\Facades\Auth;

class CreateTeamAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): Team
    {
        $data['created_by'] = Auth::id();

        $team = Team::create($data);

        if (! (new TeamOwnerResource)->isAdmin()) {
            TeamUser::create([
                'team_id' => $team->id,
                'user_id' => Auth::id(),
                'team_role' => TeamRole::MANAGER->value,
                'joined_at' => now(),
            ]);
        }

        return $team->load('users');
    }
}
