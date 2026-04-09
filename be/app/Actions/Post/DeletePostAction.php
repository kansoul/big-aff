<?php

namespace App\Actions\Post;

use App\Enums\PostStatus;
use App\Models\Post;

class DeletePostAction
{
    public function execute(Post $post): void
    {
        $post->update(['status' => PostStatus::TRASH]);
    }
}
