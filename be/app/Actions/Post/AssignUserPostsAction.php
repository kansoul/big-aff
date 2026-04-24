<?php

namespace App\Actions\Post;

use App\Models\Post;
use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class AssignUserPostsAction
{
    /**
     * Sync post assignments for a user (view-only access).
     * Only posts accessible to the auth user can be assigned.
     *
     * @param  array<int>  $postIds
     *
     * @throws AuthorizationException
     */
    public function execute(User $user, array $postIds): void
    {
        $ownership = OwnershipFilter::forAuthUser();

        if (! $ownership->isAdmin() && ! in_array($user->id, $ownership->allowedUserIds(), true)) {
            throw new AuthorizationException;
        }

        $existingPostIds = Post::whereIn('id', $postIds)->pluck('id')->all();

        $user->assignedPosts()->sync($existingPostIds);
    }
}
