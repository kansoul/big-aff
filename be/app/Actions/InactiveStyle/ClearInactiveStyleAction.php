<?php

namespace App\Actions\InactiveStyle;

use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
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
        (new UserOwnerResource)->authorize($user);

        $user->update(['style_id' => null]);
    }
}
