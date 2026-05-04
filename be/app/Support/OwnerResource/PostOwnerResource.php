<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\Auth;

/**
 * Post is accessible when:
 * - created by an allowed user, OR
 * - the auth user is explicitly assigned to the post via `post_user`, OR
 * - any ads_link for this post was created by an allowed user.
 */
final class PostOwnerResource extends OwnerResource
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

        $query->where(function (Builder $q) use ($allowedIds, $authId): void {
            $q->whereIn('created_by', $allowedIds)
                ->orWhereHas('assignedUsers', fn (Builder $q2) => $q2->where('users.id', $authId))
                ->orWhereExists(
                    fn (QueryBuilder $q3) => $q3
                        ->from('ads_links')
                        ->whereColumn('ads_links.post_id', 'posts.id')
                        ->whereIn('ads_links.created_by', $allowedIds)
                );
        });
    }
}
