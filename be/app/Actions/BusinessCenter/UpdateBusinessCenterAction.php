<?php

namespace App\Actions\BusinessCenter;

use App\Models\BusinessCenter;
use App\Support\OwnerResource\BusinessCenterOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

class UpdateBusinessCenterAction
{
    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(BusinessCenter $businessCenter, array $data): BusinessCenter
    {
        (new BusinessCenterOwnerResource)->authorize($businessCenter);

        $data['updated_by'] = Auth::id();
        $businessCenter->update($data);

        return $businessCenter->fresh(['team']);
    }
}
