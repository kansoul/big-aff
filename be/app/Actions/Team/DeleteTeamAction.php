<?php

namespace App\Actions\Team;

use App\Models\Team;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteTeamAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Team $team): void
    {
        OwnershipFilter::forAuthUser()->authorize($team->created_by);

        $team->delete();
    }
}
