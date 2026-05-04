<?php

namespace App\Actions\Post;

use App\Models\Post;
use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
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
        (new UserOwnerResource)->authorize($user);

        $existingPostIds = Post::whereIn('id', $postIds)->pluck('id')->all();

        $user->assignedPosts()->sync($existingPostIds);
    }
}
