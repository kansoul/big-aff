<?php

namespace App\Actions\Post;

use App\Models\Post;
use Illuminate\Support\Facades\Auth;

class UpdatePostAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Post $post, array $data): Post
    {
        $data['updated_by'] = Auth::id();

        $post->update($data);

        return $post->fresh(['featureMedia', 'category']);
    }
}
