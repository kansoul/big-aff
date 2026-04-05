<?php

namespace App\Models;

use App\Enums\UserStatus;
use App\Models\Traits\Attribute\UserAttribute;
use App\Models\Traits\Method\UserMethod;
use App\Models\Traits\Observers\UserObserver;
use App\Models\Traits\Relationship\UserRelationship;
use App\Models\Traits\Scope\UserScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, UserAttribute, UserMethod, UserObserver, UserRelationship, UserScope;

    protected $fillable = [
        'role_id',
        'style_id',
        'avatar_id',
        'name',
        'email',
        'password',
        'email_verified_at',
        'status',
        'description',
        'created_by',
        'updated_by',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => UserStatus::class,
        ];
    }
}
