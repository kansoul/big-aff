<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * AdX account ownership follows the `adx_account_user` pivot.
 */
final class AdxAccountOwnerResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        if (! $model->users()->whereIn('users.id', $allowedIds)->exists() && $model->created_by !== Auth::id()) {
            throw new AuthorizationException;
        }
    }

    protected function scope(Builder $query, array $allowedIds): void
    {
        $query->where(function (Builder $builder) use ($allowedIds): void {
            $builder->whereIn('created_by', $allowedIds)
                ->orWhereHas('users', fn (Builder $userQuery) => $userQuery->whereIn('users.id', $allowedIds));
        });
    }
}
