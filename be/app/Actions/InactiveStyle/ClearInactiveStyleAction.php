<?php

namespace App\Actions\InactiveStyle;

use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class ClearInactiveStyleAction
{
    /**
     * Remove the style assignment from the given user.
     *
     * @throws AuthorizationException
     */
    public function execute(User $user): void
    {
        OwnershipFilter::forAuthUser()->authorize($user->created_by);

        $user->update(['style_id' => null]);
    }
}
