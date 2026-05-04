<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\Auth;

/**
 * File is accessible when:
 * - uploaded by an allowed user (user_id), OR
 * - used as feature_media on a post the auth user can access.
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
        $authId = Auth::id();

        $query->where(function (Builder $q) use ($allowedIds, $authId): void {
            $q->whereIn('user_id', $allowedIds)
                ->orWhereExists(
                    fn (QueryBuilder $q2) => $q2
                        ->from('posts')
                        ->whereColumn('posts.feature_media_id', 'files.id')
                        ->where(function (QueryBuilder $q3) use ($allowedIds, $authId): void {
                            $q3->whereIn('posts.created_by', $allowedIds)
                                ->orWhereExists(
                                    fn (QueryBuilder $q4) => $q4
                                        ->from('post_user')
                                        ->whereColumn('post_user.post_id', 'posts.id')
                                        ->where('post_user.user_id', $authId)
                                )
                                ->orWhereExists(
                                    fn (QueryBuilder $q5) => $q5
                                        ->from('ads_links')
                                        ->whereColumn('ads_links.post_id', 'posts.id')
                                        ->whereIn('ads_links.created_by', $allowedIds)
                                );
                        })
                );
        });
    }
}
