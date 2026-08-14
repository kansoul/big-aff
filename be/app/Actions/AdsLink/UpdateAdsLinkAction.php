<?php

namespace App\Actions\AdsLink;

use App\Models\AdsLink;
use App\Models\Pixel;
use App\Services\AdsLink\RACValidationService;
use App\Support\OwnerResource\AdsLinkOwnerResource;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateAdsLinkAction
{
    public function __construct(
        private readonly RACValidationService $racValidationService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(AdsLink $adsLink, array $data): AdsLink
    {
        (new AdsLinkOwnerResource)->authorize($adsLink);

        if (array_key_exists('rac', $data) && $data['rac'] !== null) {
            $racValidation = $this->racValidationService->validateRAC($data['rac']);
            if (! $racValidation['is_valid']) {
                throw ValidationException::withMessages([
                    'rac' => [$racValidation['warning']],
                ]);
            }
        }

        $trackingIds = $adsLink->tracking_ids ?? [];
        if (array_key_exists('googleid', $data)) {
            if (! empty($data['googleid'])) {
                $trackingIds['googleid'] = $this->csvValues($data['googleid']);
            } else {
                unset($trackingIds['googleid']);
            }
        }

        if (array_key_exists('tiktokid', $data)) {
            if (! empty($data['tiktokid'])) {
                $trackingIds['tiktokid'] = $this->csvValues($data['tiktokid']);
            } else {
                unset($trackingIds['tiktokid']);
                unset($trackingIds['tiktok_pixel_id']);
            }
        }

        if (array_key_exists('pixel_id', $data)) {
            if (! empty($data['pixel_id'])) {
                $pixel = Pixel::query()->findOrFail($data['pixel_id']);
                OwnershipFilter::forAuthUser()->authorize($pixel->created_by);
                $trackingIds['tiktok_pixel_id'] = array_fill(0, count($trackingIds['tiktokid'] ?? []), $pixel->pixel_id);
            } else {
                unset($trackingIds['tiktok_pixel_id']);
            }
        }

        $payload = [
            'tracking_ids' => $trackingIds,
            'updated_by' => Auth::id(),
        ];
        if (array_key_exists('pixel_id', $data)) {
            $payload['pixel_id'] = $data['pixel_id'];
        }

        if (array_key_exists('rac', $data) && $data['rac'] !== null) {
            $payload['rac'] = $data['rac'];
        }

        if (array_key_exists('note', $data)) {
            $payload['note'] = $data['note'];
        }

        DB::transaction(function () use ($adsLink, $payload): void {
            $adsLink->update($payload);
        });

        return $adsLink->fresh();
    }

    /** @return array<int, string> */
    private function csvValues(string $value): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $value))));
    }
}
