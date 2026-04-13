<?php

namespace App\Actions\Follow;

use App\Models\Follow;
use App\Models\Site;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteFollowAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Follow $follow): void
    {
        // Follow has no created_by; ownership is determined via the site it belongs to.
        $site = Site::query()->findOrFail($follow->site_id);
        OwnershipFilter::forAuthUser()->authorize($site->created_by);

        $follow->delete();
    }
}
