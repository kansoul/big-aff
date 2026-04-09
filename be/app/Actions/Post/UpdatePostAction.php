<?php

namespace App\Actions\Post;

use App\Models\Post;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

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

        $data['updated_by'] = Auth::id();

        $post->update($data);

        return $post->fresh(['featureMedia', 'category']);
    }
}
