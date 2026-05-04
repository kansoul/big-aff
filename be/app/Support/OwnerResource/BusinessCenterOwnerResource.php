<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;

/**
 * BusinessCenter is accessible when an allowed user belongs to its team via team_user.
 */
final class BusinessCenterOwnerResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        $accessible = DB::table('team_user')
            ->where('team_id', $model->team_id)
            ->whereIn('user_id', $allowedIds)
            ->exists();

        if (! $accessible) {
            throw new AuthorizationException;
        }
    }

    protected function scope(Builder $query, array $allowedIds): void
    {
        $query->whereIn('created_by', $allowedIds)
            ->orWhereExists(
                fn (QueryBuilder $q) => $q
                    ->from('team_user')
                    ->whereColumn('team_user.team_id', 'business_centers.team_id')
                    ->whereIn('team_user.user_id', $allowedIds)
            );
    }
}
