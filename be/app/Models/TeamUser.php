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
        'single_team_key',
    ];

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'team_role' => TeamRole::class,
        ];
    }

    /**
     * Automatically compute `single_team_key` before saving:
     * - leader/member → user_id  (unique constraint prevents joining a second team)
     * - manager       → NULL     (NULLs are not unique, so managers may be in many teams)
     */
    protected static function booted(): void
    {
        $setSingleTeamKey = static function (self $model): void {
            $role = $model->team_role instanceof TeamRole
                ? $model->team_role
                : TeamRole::from($model->team_role);

            $model->single_team_key = $role === TeamRole::MANAGER ? null : $model->user_id;
        };

        static::creating($setSingleTeamKey);
        static::updating($setSingleTeamKey);
    }
}
