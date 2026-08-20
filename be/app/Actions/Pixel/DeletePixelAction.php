<?php

namespace App\Actions\Pixel;

use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;

class DeletePixelAction
{
    public function execute(Pixel $pixel): void
    {
        OwnershipFilter::forAuthUser()->authorize($pixel->created_by);
        $pixel->delete();
    }
}
