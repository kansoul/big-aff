<?php

namespace App\Models;

use App\Models\Traits\Method\GoogleOAuthTokenMethod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GoogleOAuthToken extends Model
{
    use GoogleOAuthTokenMethod;
    use HasFactory;

    protected $table = 'google_oauth_tokens';

    protected $fillable = [
        'access_token',
        'refresh_token',
        'token_type',
        'expires_in',
        'expires_at',
        'scope',
        'is_active',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
        'expires_in' => 'integer',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];
}
