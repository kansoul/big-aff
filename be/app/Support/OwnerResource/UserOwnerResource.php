<?php

namespace App\Support\OwnerResource;

use App\Enums\TeamRole;
use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * User is accessible when they are within the auth user's allowed scope,
 * AND they are not a manager in any team (managers are peers, not subordinates).
 *
 * Self is always included so the auth user can always see their own record.
 *
 * Example: if A (manager of team A+B) has B (manager of team B) as a
 * parent-child descendant, A still cannot see B in listings because B
 * holds a manager role — and vice versa.
 */
final class UserOwnerResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        if (in_array($model->id, $allowedIds, true)) {
            return;
        }

        if ($model->created_by === Auth::id()) {
            return;
        }

        throw new AuthorizationException;
    }

    protected function scope(Builder $query, array $allowedIds): void
    {
        $authId = Auth::id();

        $query->where(function (Builder $q) use ($allowedIds, $authId) {
            $q->whereIn('users.id', $allowedIds)
                ->orWhere('users.created_by', $authId);
        })
            ->where(function (Builder $q) use ($authId): void {
                $q->where('users.id', $authId)
                    ->orWhere('users.created_by', $authId)
                    ->orWhereDoesntHave('teams', fn (Builder $tq) => $tq->where(
                        'team_user.team_role', TeamRole::MANAGER->value
                    ));
            });
    }
}
