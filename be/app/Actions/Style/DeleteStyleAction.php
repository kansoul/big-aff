<?php

namespace App\Actions\Style;

use App\Models\Style;

class DeleteStyleAction
{
    public function execute(Style $style): void
    {
        $style->delete();
    }
}
