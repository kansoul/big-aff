<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Site is accessible when:
 * - created by an allowed user, OR
 * - explicitly assigned to an allowed user via the `user_sites` pivot.
 */
final class SiteOwnerResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        $accessible = in_array($model->created_by, $allowedIds, true)
            || $model->users()->whereIn('users.id', $allowedIds)->exists();

        if (! $accessible) {
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
