<?php

namespace App\Actions\Auth;

use App\Exceptions\AuthenticationException;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class LoginAction
{
    /**
     * @param  array{email: string, password: string}  $credentials
     *
     * @throws AuthenticationException
     */
    public function execute(array $credentials, bool $remember = false): User
    {
        unset($credentials['remember']);
        if (! Auth::attempt($credentials, $remember)) {
            throw new AuthenticationException('Invalid credentials provided.');
        }

        /** @var User $user */
        $user = Auth::user();
        $user->load('role.rolePermissions');

        if (request()->hasSession()) {
            request()->session()->regenerate();
        }

        return $user;
    }
}
