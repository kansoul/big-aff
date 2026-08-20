<?php

namespace App\Actions\Link;

use App\Models\Link;

class UpdateLinkAction
{
    public function execute(Link $link, array $data): Link
    {
        $link->update($data);

        return $link->fresh() ?? $link;
    }
}
