<?php

namespace App\Actions\Auth;

use App\Exceptions\AuthenticationException;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class LoginAction
{
    /**
     * @param array{email: string, password: string} $credentials
     * @throws AuthenticationException
     */
    public function execute(array $credentials): User
    {
        if (!Auth::attempt($credentials)) {
            throw new AuthenticationException('Invalid credentials provided.');
        }

        /** @var User $user */
        $user = Auth::user();

        request()->session()->regenerate();

        return $user;
    }
}
