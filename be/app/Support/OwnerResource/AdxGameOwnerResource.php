<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * AdX game is accessible when created by an allowed user or explicitly assigned.
 */
final class AdxGameOwnerResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        $accessible = in_array($model->created_by, $allowedIds, true)
            || $model->assignedUsers()->where('users.id', Auth::id())->exists();

        if (! $accessible) {
            throw new AuthorizationException;
        }
    }

    protected function scope(Builder $query, array $allowedIds): void
    {
        $authId = Auth::id();

        $query->where(function (Builder $builder) use ($allowedIds, $authId): void {
            $builder->whereIn('created_by', $allowedIds)
                ->orWhereHas('assignedUsers', fn (Builder $userQuery) => $userQuery->where('users.id', $authId));
        });
    }
}
