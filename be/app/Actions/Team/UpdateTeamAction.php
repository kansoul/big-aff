<?php

namespace App\Actions\Team;

use App\Models\Team;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

class UpdateTeamAction
{
    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(Team $team, array $data): Team
    {
        OwnershipFilter::forAuthUser()->authorize($team->created_by);

        $data['updated_by'] = Auth::id();
        $team->update($data);

        return $team->fresh(['users']);
    }
}
