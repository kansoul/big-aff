<?php

namespace App\Actions\Style;

use App\Models\Style;
use App\Support\OwnershipFilter\OwnershipFilter;

class DeleteStyleAction
{
    public function execute(Style $style): void
    {
        OwnershipFilter::forAuthUser()->authorize($style->created_by);

        $style->delete();
    }
}
