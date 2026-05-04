<?php

namespace App\Actions\Option;

use App\Models\Team;
use App\Support\OwnerResource\TeamOwnerResource;
use Illuminate\Support\Collection;

class GetTeamOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(): Collection
    {
        $query = Team::query()->select(['id', 'name'])->orderBy('name');

        (new TeamOwnerResource)->applyTo($query);

        return $query->get();
    }
}
