<?php

namespace App\Actions\Site;

use App\Models\Site;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class GetSiteOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(): Collection
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Site::query()->select(['id', 'name'])->orderBy('name');
        $ownership->applyTo($query);

        return $query->get();
    }
}
