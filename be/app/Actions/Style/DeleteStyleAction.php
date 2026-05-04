<?php

namespace App\Actions\Style;

use App\Models\Style;
use App\Support\OwnerResource\StyleOwnerResource;

class DeleteStyleAction
{
    public function execute(Style $style): void
    {
        (new StyleOwnerResource)->authorize($style);

        $style->delete();
    }
}
