<?php

namespace App\Actions\Auth;

use App\Exceptions\AuthenticationException;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;

class SwitchAccountAction
{
    /**
     * @throws AuthenticationException
     */
    public function execute(string $token): User
    {
        $accessToken = PersonalAccessToken::findToken($token);

        if (! $accessToken || ! $accessToken->tokenable instanceof User) {
            throw new AuthenticationException('Invalid or expired token.');
        }

        if ($accessToken->expires_at && $accessToken->expires_at->isPast()) {
            $accessToken->delete();
            throw new AuthenticationException('Invalid or expired token.');
        }

        /** @var User $user */
        $user = $accessToken->tokenable;
        $user->load('role');

        Auth::guard('web')->login($user);

        if (request()->hasSession()) {
            request()->session()->regenerate();
        }

        return $user;
    }
}
