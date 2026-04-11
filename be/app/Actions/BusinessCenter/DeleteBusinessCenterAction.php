<?php

namespace App\Actions\BusinessCenter;

use App\Models\BusinessCenter;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteBusinessCenterAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(BusinessCenter $businessCenter): void
    {
        OwnershipFilter::forAuthUser()->authorize($businessCenter->created_by);

        $businessCenter->delete();
    }
}
