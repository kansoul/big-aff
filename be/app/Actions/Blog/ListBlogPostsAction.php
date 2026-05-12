<?php

namespace App\Actions\Blog;

use App\Enums\PostStatus;
use App\Models\Post;
use Illuminate\Database\Eloquent\Collection;

class ListBlogPostsAction
{
    public function execute(int $limit, ?int $categoryId = null): Collection
    {
        return Post::query()
            ->select('posts.*')
            ->selectRaw('SUM(realtime_reports.click_ad_count) as total_click_ad_count')
            ->join('ads_links', 'ads_links.post_id', '=', 'posts.id')
            ->join('link_datas', 'link_datas.ads_link_id', '=', 'ads_links.id')
            ->join('realtime_reports', 'realtime_reports.link_data_id', '=', 'link_datas.id')
            ->where('posts.status', PostStatus::PUBLISHED)
            ->where('posts.is_hidden', false)
            ->when(
                $categoryId,
                fn ($q) => $q->where('posts.category_id', $categoryId),
                fn ($q) => $q->where('realtime_reports.event_time', '>=', now()->subDays(30)->toDateString())
            )
            ->whereNull('ads_links.deleted_at')
            ->whereNull('link_datas.deleted_at')
            ->groupBy('posts.id')
            ->orderByDesc('total_click_ad_count')
            ->limit($limit)
            ->with(['featureMedia', 'category'])
            ->get();
    }
}
