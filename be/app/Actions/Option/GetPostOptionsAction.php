<?php

namespace App\Actions\Option;

use App\Models\Post;
use App\Support\OwnerResource\PostOwnerResource;
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
            ->with('keywordSets:id,name');

        (new PostOwnerResource)->applyTo($query);

        return $query->orderBy('id')
            ->get()
            ->map(fn (Post $post) => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'keyword_sets' => $post->keywordSets->map(fn ($keywordSet) => [
                    'id' => $keywordSet->id,
                    'name' => $keywordSet->name,
                ]),
            ]);
    }
}
