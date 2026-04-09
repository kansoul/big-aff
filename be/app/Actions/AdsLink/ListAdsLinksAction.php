<?php

namespace App\Actions\AdsLink;

use App\Models\AdsLink;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdsLinksAction
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        return AdsLink::query()
            ->with(['site', 'post', 'keywordSet'])
            ->when(! empty($filters['keyword']), function ($q) use ($filters): void {
                $q->where(function ($inner) use ($filters): void {
                    $inner->where('slug', 'like', '%'.$filters['keyword'].'%')
                        ->orWhereHas('post', fn ($p) => $p->where('title', 'like', '%'.$filters['keyword'].'%'));
                });
            })
            ->when(! empty($filters['site_id']), fn ($q) => $q->where('site_id', $filters['site_id']))
            ->when(! empty($filters['post_id']), fn ($q) => $q->where('post_id', $filters['post_id']))
            ->when(! empty($filters['channel_code']), fn ($q) => $q->where('channel_code', $filters['channel_code']))
            ->when(! empty($filters['created_by']), fn ($q) => $q->where('created_by', $filters['created_by']))
            ->when(! empty($filters['pixel_id']), fn ($q) => $q->whereJsonContains('tracking_ids->fbid', $filters['pixel_id']))
            ->when(! empty($filters['googleid']), fn ($q) => $q->whereJsonContains('tracking_ids->googleid', $filters['googleid']))
            ->when(! empty($filters['date_from']), fn ($q) => $q->whereDate('created_at', '>=', $filters['date_from']))
            ->when(! empty($filters['date_to']), fn ($q) => $q->whereDate('created_at', '<=', $filters['date_to']))
            ->when(isset($filters['is_hidden']) && $filters['is_hidden'] !== null, fn ($q) => $q->where('is_hidden', $filters['is_hidden']))
            ->latest()
            ->paginate(15);
    }
}
