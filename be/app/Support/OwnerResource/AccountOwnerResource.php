<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Account is accessible when an allowed user is assigned via the `account_user` pivot.
 */
final class AccountOwnerResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        if (! $model->users()->whereIn('users.id', $allowedIds)->exists()) {
            throw new AuthorizationException;
        }
    }

    protected function scope(Builder $query, array $allowedIds): void
    {
        $query->where(function (Builder $q) use ($allowedIds): void {
            $q->whereIn('created_by', $allowedIds)
                ->orWhereHas('users', fn (Builder $uq) => $uq->whereIn('users.id', $allowedIds));
        });
    }
}
