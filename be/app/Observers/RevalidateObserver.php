<?php

namespace App\Observers;

use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Models\AdsLink;
use App\Models\Post;
use App\Models\Site;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Http;

class RevalidateObserver
{
    public function created(Model $model): void
    {
        $this->revalidateIfNeeded($model);
    }

    public function updated(Model $model): void
    {
        $this->revalidateIfNeeded($model);
    }

    protected function revalidateIfNeeded(Model $model): void
    {
        if (! $this->shouldRevalidate($model)) {
            return;
        }

        $secret = config('services.revalidate.internal_secret');

        if (! $secret) {
            return;
        }

        $urls = $this->resolveUrls($model);

        foreach ($urls as $url) {
            Http::withHeaders(['X-Internal-Secret' => $secret])->get($url);
        }
    }

    /**
     * @return array<string>
     */
    protected function resolveUrls(Model $model): array
    {
        if ($model instanceof Post) {
            return AdsLink::where('post_id', $model->id)
                ->with('site')
                ->get()
                ->pluck('site.url')
                ->filter()
                ->unique()
                ->map(fn (string $siteUrl) => $siteUrl.'/api/ran?re-tag=articles/'.$model->slug)
                ->values()
                ->all();
        }

        if ($model instanceof Site) {
            return [$model->url.'/api/ran?re-tag=site'];
        }

        if ($model instanceof AdsLink) {
            $siteUrl = $model->site?->url;

            if (! $siteUrl) {
                return [];
            }

            return [$siteUrl.'/api/ran?re-tag=post-'.$model->slug];
        }

        return [];
    }

    protected function shouldRevalidate(Model $model): bool
    {
        if ($model instanceof Post) {
            return match ($model->type) {
                PostType::AI => in_array($model->status, [PostStatus::DRAFT, PostStatus::PUBLISHED], true),
                PostType::NORMAL, PostType::WORDPRESS => $model->status === PostStatus::PUBLISHED,
                default => false,
            };
        }

        return true;
    }
}
