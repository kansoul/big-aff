<?php

namespace App\Providers;

use App\Models\AdsLink;
use App\Models\Post;
use App\Models\Site;
use App\Observers\RevalidateObserver;
use App\Services\Storage\StorageService;
use App\Services\Storage\StorageServiceInterface;
use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(StorageServiceInterface::class, StorageService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Post::observe(RevalidateObserver::class);
        Site::observe(RevalidateObserver::class);
        AdsLink::observe(RevalidateObserver::class);

        Model::preventLazyLoading(! app()->isProduction());

        Scramble::configure()
            ->withDocumentTransformers(function (OpenApi $openApi) {
                $openApi->secure(
                    SecurityScheme::http('bearer', 'sanctum'),
                );
            });
    }
}
