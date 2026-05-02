<?php

namespace App\Actions\Post;

use App\Models\Post;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class GetPostOptionsAction
{
    /**
     * @return Collection<int, array{id: int, title: string, slug: string, keyword_sets: array<int, array{id: int, name: string}>}>
     */
    public function execute(): Collection
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Post::query()
            ->select(['id', 'title', 'slug'])
            ->with('keywordSets:id,name')
            ->orderBy('title');

        if (! $ownership->isAdmin()) {
            $allowedIds = $ownership->allowedUserIds();
            $authUserId = Auth::id();
            $query->where(function ($q) use ($allowedIds, $authUserId): void {
                $q->whereIn('created_by', $allowedIds)
                    ->orWhereHas('assignedUsers', fn ($q2) => $q2->where('users.id', $authUserId))
                    ->orWhereExists(fn ($q3) => $q3->from('ads_links')
                        ->whereColumn('ads_links.post_id', 'posts.id')
                        ->whereIn('ads_links.created_by', $allowedIds)
                    );
            });
        }

        return $query->get()
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
