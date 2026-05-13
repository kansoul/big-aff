<?php

namespace App\Observers;

use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Models\AdsLink;
use App\Models\Post;
use App\Models\Site;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
            $this->revalidateUrl($url, $secret, $model);
        }
    }

    protected function revalidateUrl(string $url, string $secret, Model $model): void
    {
        try {
            Http::retry(3, 250)
                ->connectTimeout(5)
                ->timeout(10)
                ->withHeaders(['X-Internal-Secret' => $secret])
                ->get($url);
        } catch (ConnectionException $exception) {
            Log::warning('Failed to revalidate site URL.', [
                'url' => $url,
                'model' => $model::class,
                'model_id' => $model->getKey(),
                'error' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * @return array<string>
     */
    protected function resolveUrls(Model $model): array
    {
        if ($model instanceof Post) {
            return Site::query()
                ->pluck('url')
                ->filter()
                ->unique()
                ->map(fn (string $siteUrl) => $siteUrl.'/api/ran?re-tag='.$model->slug)
                ->values()
                ->all();
        }

        if ($model instanceof Site) {
            $domain = parse_url($model->url, PHP_URL_HOST) ?: $model->url;
            $domain = preg_replace('/^https?:\/\//', '', $domain);
            $domain = rtrim($domain, '/');

            return [$model->url.'/api/ran?re-tag='.$domain];
        }

        if ($model instanceof AdsLink) {
            $siteUrl = $model->loadMissing('site')->site?->url;

            if (! $siteUrl) {
                return [];
            }

            return [$siteUrl.'/api/ran?re-tag='.$model->slug];
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
