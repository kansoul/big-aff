<?php

namespace App\Actions\Post;

use App\Models\Post;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreatePostAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): Post
    {
        return DB::transaction(function () use ($data): Post {
            $keywordSetIds = $data['keyword_set_ids'] ?? [];
            unset($data['keyword_set_ids']);

            $data['created_by'] = Auth::id();

            $post = Post::create($data);

            if (! empty($keywordSetIds)) {
                $post->keywordSets()->sync($keywordSetIds);
            }

            return $post;
        });
    }
}
