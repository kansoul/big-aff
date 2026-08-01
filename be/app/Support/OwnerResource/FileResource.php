<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * File is accessible when uploaded by an allowed user.
 */
final class FileResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        // File uses `user_id` (not `created_by`) as the owner column.
        if (! in_array($model->user_id, $allowedIds, true)) {
            throw new AuthorizationException;
        }
    }

    protected function scope(Builder $query, array $allowedIds): void
    {
        $query->whereIn('user_id', $allowedIds);
    }
}
