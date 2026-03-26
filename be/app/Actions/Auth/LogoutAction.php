<?php

namespace App\Actions\Auth;

use Illuminate\Support\Facades\Auth;

class LogoutAction
{
    public function execute(): void
    {
        Auth::guard('web')->logout();

        request()->session()->invalidate();
        request()->session()->regenerateToken();
    }
}
