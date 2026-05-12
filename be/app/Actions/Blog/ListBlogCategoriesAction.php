<?php

namespace App\Actions\Blog;

use App\Enums\PostStatus;
use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;

class ListBlogCategoriesAction
{
    public function execute(int $limit): Collection
    {
        return Category::query()
            ->select('categories.*')
            ->selectRaw('SUM(realtime_reports.click_ad_count) as total_click_ad_count')
            ->join('posts', 'posts.category_id', '=', 'categories.id')
            ->join('ads_links', 'ads_links.post_id', '=', 'posts.id')
            ->join('link_datas', 'link_datas.ads_link_id', '=', 'ads_links.id')
            ->join('realtime_reports', 'realtime_reports.link_data_id', '=', 'link_datas.id')
            ->where('posts.status', PostStatus::PUBLISHED)
            ->where('posts.is_hidden', false)
            ->whereNull('posts.deleted_at')
            ->whereNull('ads_links.deleted_at')
            ->whereNull('link_datas.deleted_at')
            ->where('realtime_reports.event_time', '>=', now()->subDays(30)->toDateString())
            ->groupBy('categories.id')
            ->orderByDesc('total_click_ad_count')
            ->limit($limit)
            ->get();
    }
}
