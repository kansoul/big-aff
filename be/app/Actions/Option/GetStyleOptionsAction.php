<?php

namespace App\Actions\Option;

use App\Models\Style;
use App\Support\OwnerResource\StyleOwnerResource;
use Illuminate\Support\Collection;

class GetStyleOptionsAction
{
    /**
     * @return Collection<int, array{id: int, code: string, name: string}>
     */
    public function execute(): Collection
    {
        $query = Style::query()
            ->select(['id', 'code', 'name'])
            ->orderBy('name');

        (new StyleOwnerResource)->applyTo($query);

        return $query->get();
    }
}
