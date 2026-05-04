<?php

namespace App\Actions\Post;

use App\Models\Post;
use App\Support\OwnerResource\PostOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

class ToggleHiddenPostAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Post $post, bool $isHidden): Post
    {
        (new PostOwnerResource)->authorize($post);

        $post->update([
            'is_hidden' => $isHidden,
            'updated_by' => Auth::id(),
        ]);

        return $post;
    }
}
