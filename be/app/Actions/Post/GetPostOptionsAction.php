<?php

namespace App\Actions\Post;

use App\Models\Post;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class GetPostOptionsAction
{
    /**
     * @return Collection<int, array{id: int, title: string, slug: string, keyword_sets: array<int, array{id: int, name: string}>}>
     */
    public function execute(): Collection
    {
        $query = Post::query()
            ->select(['id', 'title', 'slug'])
            ->orderBy('title');

        OwnershipFilter::forAuthUser()->applyTo($query);

        return $query->get()
            ->map(fn(Post $post) => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
            ]);
    }
}
