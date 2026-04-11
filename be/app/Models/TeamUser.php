<?php

namespace App\Models;

use App\Enums\TeamRole;
use App\Models\Traits\Relationship\TeamUserRelationship;
use Illuminate\Database\Eloquent\Model;

class TeamUser extends Model
{
    use TeamUserRelationship;

    protected $table = 'team_user';

    protected $fillable = [
        'team_id',
        'user_id',
        'joined_at',
        'team_role',
    ];

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'team_role' => TeamRole::class,
        ];
    }
}
