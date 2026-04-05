<?php

namespace App\Actions\Site;

use App\Models\Site;

class DeleteSiteAction
{
    public function execute(Site $site): void
    {
        $site->delete();
    }
}
