<?php

namespace App\Actions\Site;

use App\Enums\SiteStatus;
use App\Models\Site;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteSiteAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Site $site): void
    {
        OwnershipFilter::forAuthUser()->authorize($site->created_by);

        $site->update(['status' => SiteStatus::SUSPENDED]);
    }
}
