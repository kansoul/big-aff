<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * Follow has no created_by; ownership is determined via the site it belongs to.
 * authorizeRecord is not implemented — callers should authorize via SiteOwnerResource on the parent site.
 */
final class FollowOwnerResource extends OwnerResource
{
    protected function scope(Builder $query, array $allowedIds): void
    {
        $query->whereExists(
            fn (QueryBuilder $q) => $q
                ->from('sites')
                ->whereColumn('sites.id', 'follows.site_id')
                ->whereIn('sites.created_by', $allowedIds)
        );
    }
}
