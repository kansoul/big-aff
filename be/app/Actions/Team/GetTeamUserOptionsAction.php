<?php

namespace App\Actions\Team;

use App\Models\Team;
use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class GetTeamUserOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string, email: string}>
     */
    public function execute(Team $team): Collection
    {
        $ownership = OwnershipFilter::forAuthUser();

        $assignedUserIds = $team->users()->pluck('users.id');

        $query = User::query()
            ->select(['id', 'name', 'email'])
            ->whereNotIn('id', $assignedUserIds)
            ->orderBy('name');

        $ownership->applyTo($query);

        return $query->get();
    }
}
