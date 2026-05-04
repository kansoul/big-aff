<?php

namespace App\Actions\Site;

use App\Enums\SiteStatus;
use App\Models\Site;
use App\Support\OwnerResource\SiteOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteSiteAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Site $site): void
    {
        (new SiteOwnerResource)->authorize($site);

        $site->update(['status' => SiteStatus::SUSPENDED]);
    }
}
