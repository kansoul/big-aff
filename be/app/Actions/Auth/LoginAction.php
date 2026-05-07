<?php

namespace App\Actions\Auth;

use App\Exceptions\AuthenticationException;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class LoginAction
{
    /**
     * @param  array{email: string, password: string}  $credentials
     * @return array{user: User, token: string}
     *
     * @throws AuthenticationException
     */
    public function execute(array $credentials, bool $remember = false): array
    {
        unset($credentials['remember']);
        if (! Auth::attempt($credentials, $remember)) {
            throw new AuthenticationException('Invalid credentials provided.');
        }

        /** @var User $user */
        $user = Auth::user();
        $user->load('role');

        if (request()->hasSession()) {
            request()->session()->regenerate();
        }

        $expiresAt = $remember ? now()->addYear() : now()->addDays(10);
        $token = $user->createToken('web-session', ['*'], $expiresAt)->plainTextToken;

        return ['user' => $user, 'token' => $token];
    }
}
