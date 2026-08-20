<?php

namespace App\Actions\Pixel;

use App\Models\Pixel;
use App\Support\OwnerResource\PixelOwnerResource;
use Illuminate\Support\Collection;

class ListPixelOptionsAction
{
    /** @return Collection<int, Pixel> */
    public function execute(): Collection
    {
        $query = Pixel::query()
            ->select(['id', 'pixel_id', 'name', 'platform', 'business_center_id', 'status'])
            ->where('status', 'active')
            ->orderBy('name')
            ->orderBy('pixel_id');

        (new PixelOwnerResource)->applyTo($query);

        return $query->get();
    }
}
