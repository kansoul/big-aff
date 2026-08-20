<?php

namespace App\Actions\Pixel;

use App\Models\Pixel;
use App\Support\OwnerResource\PixelOwnerResource;

class DeletePixelAction
{
    public function execute(Pixel $pixel): void
    {
        (new PixelOwnerResource)->authorize($pixel);
        $pixel->delete();
    }
}
