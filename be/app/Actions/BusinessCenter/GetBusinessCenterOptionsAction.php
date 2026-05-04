<?php

namespace App\Actions\BusinessCenter;

use App\Models\BusinessCenter;
use App\Support\OwnerResource\BusinessCenterOwnerResource;
use Illuminate\Support\Collection;

class GetBusinessCenterOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(): Collection
    {
        $query = BusinessCenter::query()->select(['id', 'name'])->orderBy('name');
        (new BusinessCenterOwnerResource)->applyTo($query);

        return $query->get();
    }
}
