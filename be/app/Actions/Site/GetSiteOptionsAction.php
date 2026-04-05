<?php

namespace App\Actions\Site;

use App\Models\Site;
use Illuminate\Support\Collection;

class GetSiteOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function execute(): Collection
    {
        return Site::query()
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();
    }
}
