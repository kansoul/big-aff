<?php

namespace App\Enums\Auth;

enum AuthStatus: string
{
    case SUCCESS = 'success';
    case FAILED = 'failed';
    case INVALID_CREDENTIALS = 'invalid_credentials';
    case LOGGED_OUT = 'logged_out';
}
