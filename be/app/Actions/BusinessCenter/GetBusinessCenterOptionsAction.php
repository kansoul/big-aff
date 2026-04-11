<?php

namespace App\Actions\BusinessCenter;

use App\Models\BusinessCenter;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class GetBusinessCenterOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(): Collection
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = BusinessCenter::query()->select(['id', 'name'])->orderBy('name');
        $ownership->applyTo($query);

        return $query->get();
    }
}
