<?php

namespace App\Actions\BusinessCenter;

use App\Models\BusinessCenter;
use App\Support\OwnerResource\BusinessCenterOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteBusinessCenterAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(BusinessCenter $businessCenter): void
    {
        (new BusinessCenterOwnerResource)->authorize($businessCenter);

        $businessCenter->delete();
    }
}
