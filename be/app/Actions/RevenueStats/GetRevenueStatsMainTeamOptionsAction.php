<?php

namespace App\Actions\RevenueStats;

use App\Models\MainTeam;
use Illuminate\Support\Collection;

class GetRevenueStatsMainTeamOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(): Collection
    {
        if (! config('main_system.is_main')) {
            return collect();
        }

        return MainTeam::query()
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();
    }
}
