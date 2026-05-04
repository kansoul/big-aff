<?php

namespace App\Actions\Post;

use App\Enums\PostStatus;
use App\Models\Post;
use App\Support\OwnerResource\PostOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;

class DeletePostAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Post $post): void
    {
        (new PostOwnerResource)->authorize($post);

        $post->update(['status' => PostStatus::TRASH]);
    }
}
