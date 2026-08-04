<?php

namespace App\Actions\Pixel;

use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;

class CreatePixelAction
{
    public function execute(array $data): Pixel
    {
        OwnershipFilter::forAuthUser();

        return Pixel::query()->create([...$data, 'created_by' => auth()->id(), 'updated_by' => auth()->id()]);
    }
}
