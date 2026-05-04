<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Channel is accessible when an allowed user is assigned via the `channel_user` pivot.
 */
final class ChannelOwnerResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        if (! in_array($model->created_by, $allowedIds, true)) {
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
