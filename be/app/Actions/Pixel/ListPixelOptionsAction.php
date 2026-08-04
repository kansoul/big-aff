<?php

namespace App\Actions\Pixel;

use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class ListPixelOptionsAction
{
    /** @return Collection<int, Pixel> */
    public function execute(): Collection
    {
        $query = Pixel::query()
            ->select(['id', 'pixel_id', 'name'])
            ->orderBy('name')
            ->orderBy('pixel_id');

        OwnershipFilter::forAuthUser()->applyTo($query);

        return $query->get();
    }
}
