<?php

namespace App\Actions\Option;

use App\Models\Site;
use App\Support\OwnerResource\SiteOwnerResource;
use Illuminate\Support\Collection;

class GetSiteOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(): Collection
    {
        $query = Site::query()->select(['id', 'name'])->orderBy('name');

        (new SiteOwnerResource)->applyTo($query);

        return $query->get();
    }
}
