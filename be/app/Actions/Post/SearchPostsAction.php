<?php

namespace App\Actions\Post;

use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Http\Resources\Post\SearchPostResource;
use App\Models\Campaign;
use App\Models\LinkData;
use App\Models\Post;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;

class SearchPostsAction
{
    /**
     * Search posts
     */
    public function execute(array $filters): AnonymousResourceCollection
    {
        $query = trim($filters['query'] ?? '');
        $postId = trim($filters['post_id'] ?? '');
        $campaignId = $filters['campaign_id'] ?? null;
        $linkData = null;
        $campaign = null;
        if ($campaignId) {
            $campaign = Campaign::where('campaign_id', $campaignId)->first();
            if ($campaign) {
                $linkData = LinkData::with('adsLink')->where('campaign_id', $campaignId)->first();
            }
        }

        $results = $this->searchPosts($query, $postId);

        return SearchPostResource::collection($results)->additional($campaign && $linkData ? [
            'campaign_id' => $campaignId,
            'style' => $linkData->style_code ?? null,
            'channel' => $linkData->channel_code ?? null,
            'fbid' => implode(',', $linkData->adsLink->tracking_ids['fbid'] ?? []),
            'account_id' => $campaign->account_id ?? null,
        ] : []);
    }

    /**
     * Search posts
     */
    private function searchPosts(string $query, string $postId): ?Collection
    {
        $base = Post::where(function ($q) {
            $q->where(function ($q1) {
                $q1->whereIn('type', [PostType::NORMAL, PostType::WORDPRESS])
                    ->where('status', PostStatus::PUBLISHED);
            })
                ->orWhere(function ($q2) {
                    $q2->where('type', PostType::AI)
                        ->whereIn('status', [PostStatus::PUBLISHED, PostStatus::DRAFT]);
                });
        });

        $targetPost = $postId ? (clone $base)->where('id', $postId)->first() : null;
        $excludeIds = $targetPost ? [$targetPost->id] : [];
        $maxRelated = $targetPost ? 2 : 3;

        $booleanQuery = $this->buildBooleanQueryFromKeyword($query);

        $related = collect();

        if ($booleanQuery !== '') {
            $searchQuery = (clone $base)->whereRaw(
                'MATCH(title, description) AGAINST (? IN BOOLEAN MODE)',
                [$booleanQuery]
            );

            $totalSearch = (clone $searchQuery)->count();

            if ($totalSearch > 0) {
                $ordered = (clone $searchQuery)
                    ->select('*')
                    ->selectRaw('MATCH(title, description) AGAINST (? IN BOOLEAN MODE) AS ft_score', [$booleanQuery])
                    ->orderByDesc('ft_score')
                    ->orderByRaw('FIELD(type, ?, ?, ?) ASC', [PostType::NORMAL, PostType::AI, PostType::WORDPRESS])
                    ->orderByDesc('id');

                $related = (clone $ordered)
                    ->when(! empty($excludeIds), function ($q) use ($excludeIds) {
                        $q->whereNotIn('id', $excludeIds);
                    })
                    ->limit($maxRelated)
                    ->get();

                if ($related->count() < $maxRelated) {
                    $pickedIds = $related->pluck('id');
                    $need = $maxRelated - $related->count();

                    $fillers = (clone $base)
                        ->when(! empty($excludeIds), function ($q) use ($excludeIds) {
                            $q->whereNotIn('id', $excludeIds);
                        })
                        ->whereNotIn('id', $pickedIds)
                        ->orderByRaw('FIELD(type, ?, ?, ?) ASC', [PostType::NORMAL, PostType::AI, PostType::WORDPRESS])
                        ->orderByDesc('id')
                        ->limit($need)
                        ->get();

                    $related = $related->concat($fillers);
                }
            }
        }

        if ($related->count() < $maxRelated) {
            $need = $maxRelated - $related->count();
            $pickedIds = $related->pluck('id')->toArray();
            $excludeAll = array_values(array_unique(array_merge($excludeIds, $pickedIds)));

            $fallback = (clone $base)
                ->when(! empty($excludeAll), function ($q) use ($excludeAll) {
                    $q->whereNotIn('id', $excludeAll);
                })
                ->orderByRaw('FIELD(type, ?, ?, ?) ASC', [PostType::NORMAL, PostType::AI, PostType::WORDPRESS])
                ->orderByDesc('id')
                ->limit($need)
                ->get();

            $related = $related->concat($fallback);
        }

        if ($targetPost) {
            $related = $related->take($maxRelated);
            $related = $related->concat(collect([$targetPost]));
        }

        return $related;
    }

    /**
     * Fallback feed: prioritize type (normal > ai > wordpress) then latest.
     */
    protected function paginateFallback(Builder $baseQuery, int $perPage): Collection
    {
        return (clone $baseQuery)
            ->orderByRaw('FIELD(type, ?, ?, ?) ASC', [PostType::NORMAL, PostType::AI, PostType::WORDPRESS])
            ->orderByDesc('id')
            ->offset(0)
            ->limit($perPage)
            ->get();
    }

    /**
     * Build boolean query from keyword
     */
    protected function buildBooleanQueryFromKeyword(string $keyword): string
    {
        if (trim($keyword) === '') {
            return '';
        }

        $s = mb_strtolower($keyword);

        $tokens = preg_split('/[\s\p{P}\p{S}]+/u', $s, -1, PREG_SPLIT_NO_EMPTY);
        if (! $tokens) {
            return '';
        }

        return implode(' ', array_map(fn ($t) => $t.'*', $tokens));
    }
}
