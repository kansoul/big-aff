<?php

namespace App\Support\OwnerResource;

use App\Models\Pixel;
use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;

final class PixelOwnerResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        if (! $model instanceof Pixel || $model->business_center_id === null) {
            throw new AuthorizationException;
        }

        $accessible = DB::table('business_centers')
            ->where('business_centers.id', $model->business_center_id)
            ->where(function (QueryBuilder $query) use ($allowedIds): void {
                $query->whereIn('business_centers.created_by', $allowedIds)
                    ->orWhereExists(fn (QueryBuilder $teamQuery) => $teamQuery
                        ->from('team_user')
                        ->whereColumn('team_user.team_id', 'business_centers.team_id')
                        ->whereIn('team_user.user_id', $allowedIds));
            })
            ->exists();

        if (! $accessible) {
            throw new AuthorizationException;
        }
    }

    protected function scope(Builder $query, array $allowedIds): void
    {
        $query->whereExists(fn (QueryBuilder $businessCenterQuery) => $businessCenterQuery
            ->from('business_centers')
            ->whereColumn('business_centers.id', 'pixels.business_center_id')
            ->where(function (QueryBuilder $ownershipQuery) use ($allowedIds): void {
                $ownershipQuery->whereIn('business_centers.created_by', $allowedIds)
                    ->orWhereExists(fn (QueryBuilder $teamQuery) => $teamQuery
                        ->from('team_user')
                        ->whereColumn('team_user.team_id', 'business_centers.team_id')
                        ->whereIn('team_user.user_id', $allowedIds));
            }));
    }
}
