<?php

namespace App\Support\OwnerResource;

use App\Enums\TeamRole;
use App\Models\TeamUser;
use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Team is accessible when the auth user is personally a member of it
 * (as any role: manager, leader, or member) via the `team_user` pivot.
 *
 * Intentionally does NOT use $allowedIds — a manager's allowed scope includes
 * their subordinates' IDs, which would expose teams those subordinates belong to.
 * The correct rule is: only teams the auth user themselves joined.
 */
final class TeamOwnerResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        $canManage = TeamUser::query()
            ->where('team_id', $model->id)
            ->where('user_id', Auth::id())
            ->whereIn('team_role', [TeamRole::MANAGER->value, TeamRole::LEADER->value])
            ->exists();

        if (! $canManage) {
            throw new AuthorizationException;
        }
    }

    protected function scope(Builder $query, array $allowedIds): void
    {
        $query->whereHas('teamUsers', fn (Builder $q) => $q->where('user_id', Auth::id()));
    }
}
