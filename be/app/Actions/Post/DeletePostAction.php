<?php

namespace App\Actions\Post;

use App\Models\Post;

class DeletePostAction
{
    public function execute(Post $post): void
    {
        $post->delete();
    }
}
