<?php

namespace App\Actions\Team;

use App\Models\Team;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class GetTeamOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(): Collection
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Team::query()->select(['id', 'name'])->orderBy('name');

        if (! $ownership->isAdmin()) {
            $query->whereHas('teamUsers', fn ($q) => $ownership->applyTo($q, 'user_id'));
        }

        return $query->get();
    }
}
