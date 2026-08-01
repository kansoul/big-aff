<?php

namespace App\Actions\Pixel;

use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Validation\ValidationException;

class DeletePixelAction
{
    public function execute(Pixel $pixel): void
    {
        OwnershipFilter::forAuthUser()->authorizeAccount($pixel->account);
        if ($pixel->adsLinks()->exists()) {
            throw ValidationException::withMessages(['pixel' => ['Pixel is used by an Ads Link.']]);
        }
        $pixel->delete();
    }
}
