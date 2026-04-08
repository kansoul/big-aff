<?php

namespace App\Actions\Post;

use App\Models\Post;
use Illuminate\Support\Facades\Auth;

class CreatePostAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): Post
    {
        $data['created_by'] = Auth::id();

        return Post::create($data);
    }
}
