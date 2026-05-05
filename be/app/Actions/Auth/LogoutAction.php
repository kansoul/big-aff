<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Auth;

class LogoutAction
{
    public function execute(): void
    {
        /** @var User|null $user */
        $user = Auth::user();

        if ($user !== null) {
            $user->tokens()->delete();
        }

        if (request()->hasSession()) {
            request()->session()->invalidate();
            request()->session()->regenerateToken();
        }
    }
}
