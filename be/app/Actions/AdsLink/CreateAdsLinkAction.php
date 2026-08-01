<?php

namespace App\Actions\AdsLink;

use App\Actions\Pixel\SyncPixelsAction;
use App\Models\AdsLink;
use App\Models\Pixel;
use App\Models\Site;
use App\Services\AdsLink\RACValidationService;
use App\Support\OwnerResource\SiteOwnerResource;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateAdsLinkAction
{
    public function __construct(
        private readonly RACValidationService $racValidationService,
        private readonly SyncPixelsAction $syncPixelsAction,
    ) {}

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

        $racValidation = $this->racValidationService->validateRAC($data['rac'] ?? '');
        if (! $racValidation['is_valid']) {
            throw ValidationException::withMessages([
                'rac' => [$racValidation['warning']],
            ]);
        }

        $baseSlug = Str::slug($site->name ?: 'ads-link');

        $trackingIds = [];
        if (! empty($data['googleid'])) {
            $trackingIds['googleid'] = $this->csvValues($data['googleid']);
        }
        if (! empty($data['tiktokid'])) {
            $trackingIds['tiktokid'] = $this->csvValues($data['tiktokid']);
            $trackingIds['tiktok_pixel_id'] = $this->csvValues($data['tiktok_pixel_id']);
        }
        if (! empty($data['pixel_id'])) {
            $pixel = Pixel::query()->with('account')->findOrFail($data['pixel_id']);
            if ($pixel->account_id !== (int) $data['account_id']) {
                throw ValidationException::withMessages(['pixel_id' => ['Pixel does not belong to the selected account.']]);
            }
            OwnershipFilter::forAuthUser()->authorizeAccount($pixel->account);
            $trackingIds['tiktokid'] = [$pixel->account->account_id];
            $trackingIds['tiktok_pixel_id'] = [$pixel->pixel_id];
        }

        try {
            return DB::transaction(function () use ($data, $baseSlug, $trackingIds, $user): AdsLink {
                $this->syncPixelsAction->execute($trackingIds);
                $slug = $this->generateUniqueSlug($baseSlug);

                return AdsLink::query()->create([
                    'site_id' => $data['site_id'],
                    'account_id' => $data['account_id'] ?? null,
                    'pixel_id' => $data['pixel_id'] ?? null,
                    'slug' => $slug,
                    'tracking_code' => Str::random(32),
                    'rac' => $data['rac'],
                    'note' => $data['note'] ?? null,
                    'is_hidden' => false,
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

    /** @return array<int, string> */
    private function csvValues(string $value): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $value))));
    }
}
