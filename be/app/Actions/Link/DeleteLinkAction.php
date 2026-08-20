<?php

namespace App\Actions\Link;

use App\Models\Link;

class DeleteLinkAction
{
    public function execute(Link $link): void
    {
        $link->delete();
    }
}
