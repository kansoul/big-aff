<?php

namespace App\Actions\Auth;

use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;

class LogoutAction
{
    public function execute(): void
    {
        /** @var User $user */
        $user = Auth::guard('web')->user();

        if ($user !== null && method_exists($user, 'currentAccessToken')) {
            $token = $user->currentAccessToken();
            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            }
        }

        Auth::guard('web')->logout();

        if (request()->hasSession()) {
            request()->session()->invalidate();
            request()->session()->regenerateToken();
        }
    }
}
