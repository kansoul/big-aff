<?php

namespace App\Actions\Post;

use App\Models\Post;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdatePostAction
{
    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(Post $post, array $data): Post
    {
        OwnershipFilter::forAuthUser()->authorize($post->created_by);

        return DB::transaction(function () use ($post, $data): Post {
            $keywordSetIds = array_key_exists('keyword_set_ids', $data) ? $data['keyword_set_ids'] : false;
            unset($data['keyword_set_ids']);

            $data['updated_by'] = Auth::id();
            $post->update($data);

            if ($keywordSetIds !== false) {
                $post->keywordSets()->sync($keywordSetIds ?? []);
            }

            return $post->fresh(['featureMedia', 'category']);
        });
    }
}
