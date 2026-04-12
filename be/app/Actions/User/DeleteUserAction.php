<?php

namespace App\Actions\User;

use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

class DeleteUserAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(User $user): void
    {
        /** @var User $auth */
        $auth = Auth::user();

        if (! $auth->canManageUser($user)) {
            throw new AuthorizationException;
        }

        $user->delete();
    }
}
