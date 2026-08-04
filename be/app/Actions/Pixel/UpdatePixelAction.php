<?php

namespace App\Actions\Pixel;

use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;

class UpdatePixelAction
{
    public function execute(Pixel $pixel, array $data): Pixel
    {
        OwnershipFilter::forAuthUser()->authorize($pixel->created_by);
        $pixel->update([...$data, 'updated_by' => auth()->id()]);

        return $pixel->fresh();
    }
}
