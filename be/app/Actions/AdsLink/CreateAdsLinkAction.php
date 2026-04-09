<?php

namespace App\Actions\AdsLink;

use App\Models\AdsLink;
use App\Models\Post;
use App\Models\Site;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateAdsLinkAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): AdsLink
    {
        $user = Auth::user();
        $styleCode = $user?->style?->style_code;

        if (empty($styleCode)) {
            $site = Site::query()->find($data['site_id']);
            $styleCode = $site?->settings['default_style'] ?? null;
        }

        $post = Post::query()->findOrFail($data['post_id']);
        $baseSlug = $post->slug;

        $trackingIds = [];
        if (! empty($data['fbid'])) {
            $trackingIds['fbid'] = array_map('trim', explode(',', $data['fbid']));
        }
        if (! empty($data['googleid'])) {
            $trackingIds['googleid'] = array_map('trim', explode(',', $data['googleid']));
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
