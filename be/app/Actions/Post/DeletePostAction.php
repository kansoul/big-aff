<?php

namespace App\Actions\Post;

use App\Enums\PostStatus;
use App\Models\Post;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class DeletePostAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Post $post): void
    {
        OwnershipFilter::forAuthUser()->authorize($post->created_by);

        $post->update(['status' => PostStatus::TRASH]);
    }
}
