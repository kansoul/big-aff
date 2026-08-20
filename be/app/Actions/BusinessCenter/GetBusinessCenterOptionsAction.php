<?php

namespace App\Actions\BusinessCenter;

use App\Models\BusinessCenter;
use App\Support\OwnerResource\BusinessCenterOwnerResource;
use Illuminate\Support\Collection;

class GetBusinessCenterOptionsAction
{
    /**
     * @return Collection<int, array{id: int, bc_id: string, name: string, ads_type: string}>
     */
    public function execute(): Collection
    {
        $query = BusinessCenter::query()->select(['id', 'bc_id', 'name', 'ads_type'])->orderBy('name');
        (new BusinessCenterOwnerResource)->applyTo($query);

        return $query->get();
    }
}
