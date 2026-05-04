<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\Auth;

/**
 * KeywordSet is accessible when:
 * - created by an allowed user, OR
 * - attached to a post the auth user can access (created_by in allowed, assigned via post_user, or ads_link created by allowed user).
 */
final class KeywordSetResource extends OwnerResource
{
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        if (! in_array($model->created_by, $allowedIds, true)) {
            throw new AuthorizationException;
        }
    }

    protected function scope(Builder $query, array $allowedIds): void
    {
        $authId = Auth::id();

        $query->where(function (Builder $q) use ($allowedIds, $authId): void {
            $q->whereIn('created_by', $allowedIds)
                ->orWhereExists(
                    fn (QueryBuilder $q2) => $q2
                        ->from('post_keyword_sets')
                        ->whereColumn('post_keyword_sets.keyword_set_id', 'keyword_sets.id')
                        ->whereExists(
                            fn (QueryBuilder $q3) => $q3
                                ->from('posts')
                                ->whereColumn('posts.id', 'post_keyword_sets.post_id')
                                ->where(function (QueryBuilder $q4) use ($allowedIds, $authId): void {
                                    $q4->whereIn('posts.created_by', $allowedIds)
                                        ->orWhereExists(
                                            fn (QueryBuilder $q5) => $q5
                                                ->from('post_user')
                                                ->whereColumn('post_user.post_id', 'posts.id')
                                                ->where('post_user.user_id', $authId)
                                        )
                                        ->orWhereExists(
                                            fn (QueryBuilder $q6) => $q6
                                                ->from('ads_links')
                                                ->whereColumn('ads_links.post_id', 'posts.id')
                                                ->whereIn('ads_links.created_by', $allowedIds)
                                        );
                                })
                        )
                );
        });
    }
}
