<?php

namespace App\Models;

use App\Models\Traits\Method\TikTokOAuthTokenMethod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TikTokOAuthToken extends Model
{
    use HasFactory;
    use TikTokOAuthTokenMethod;

    protected $table = 'tiktok_oauth_tokens';

    protected $fillable = [
        'access_token',
        'refresh_token',
        'token_type',
        'expires_in',
        'expires_at',
        'refresh_token_expires_in',
        'refresh_token_expires_at',
        'scope',
        'advertiser_ids',
        'creator_id',
        'raw_response',
        'is_active',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'refresh_token' => 'encrypted',
        'expires_at' => 'datetime',
        'refresh_token_expires_at' => 'datetime',
        'expires_in' => 'integer',
        'refresh_token_expires_in' => 'integer',
        'advertiser_ids' => 'array',
        'raw_response' => 'array',
        'is_active' => 'boolean',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];
}
