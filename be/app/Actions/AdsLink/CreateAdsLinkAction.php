<?php

namespace App\Actions\AdsLink;

use App\Models\AdsLink;
use App\Models\Post;
use App\Models\Site;
use App\Services\AdsLink\RACValidationService;
use App\Support\OwnerResource\PostOwnerResource;
use App\Support\OwnerResource\SiteOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateAdsLinkAction
{
    public function __construct(private readonly RACValidationService $racValidationService) {}

    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(array $data): AdsLink
    {
        $user = Auth::user();

        $site = Site::query()->findOrFail($data['site_id']);
        (new SiteOwnerResource)->authorize($site);

        $post = Post::query()->findOrFail($data['post_id']);
        (new PostOwnerResource)->authorize($post);

        $racValidation = $this->racValidationService->validateRAC($data['rac'] ?? '');
        if (! $racValidation['is_valid']) {
            throw ValidationException::withMessages([
                'rac' => [$racValidation['warning']],
            ]);
        }

        $styleCode = $user?->style?->style_code ?? $site->settings['default_style'] ?? null;
        $baseSlug = $post->slug;

        $trackingIds = [];
        if (! empty($data['fbid'])) {
            $trackingIds['fbid'] = array_map('trim', explode(',', $data['fbid']));
        }
        if (! empty($data['googleid'])) {
            $trackingIds['googleid'] = array_map('trim', explode(',', $data['googleid']));
        }
        if (! empty($data['tiktokid'])) {
            $trackingIds['tiktokid'] = array_map('trim', explode(',', $data['tiktokid']));
            $trackingIds['tiktok_pixel_id'] = array_map('trim', explode(',', $data['tiktok_pixel_id']));
        }

        try {
            return DB::transaction(function () use ($data, $styleCode, $baseSlug, $trackingIds, $user): AdsLink {
                $slug = $this->generateUniqueSlug($baseSlug);

                return AdsLink::query()->create([
                    'site_id' => $data['site_id'],
                    'post_id' => $data['post_id'],
                    'slug' => $slug,
                    'rac' => $data['rac'],
                    'note' => $data['note'] ?? null,
                    'is_hidden' => false,
                    'channel_code' => $data['channel_code'],
                    'style_code' => $styleCode,
                    'keyword_set_id' => $data['keyword_set_id'] ?? null,
                    'tracking_ids' => $trackingIds,
                    'created_by' => $user?->id,
                    'updated_by' => $user?->id,
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'site_id' => ['This ads link combination already exists.'],
            ]);
        }
    }

    private function generateUniqueSlug(string $baseSlug): string
    {
        $attempts = 0;

        do {
            $suffix = str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);
            $slug = $baseSlug.'-'.$suffix;
            $exists = AdsLink::withTrashed()->where('slug', $slug)->exists();
            $attempts++;
        } while ($exists && $attempts < 20);

        return $slug;
    }
}
