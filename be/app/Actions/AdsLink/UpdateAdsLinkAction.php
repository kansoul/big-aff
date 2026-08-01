<?php

namespace App\Actions\AdsLink;

use App\Models\AdsLink;
use App\Services\AdsLink\RACValidationService;
use App\Support\OwnerResource\AdsLinkOwnerResource;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class UpdateAdsLinkAction
{
    public function __construct(private readonly RACValidationService $racValidationService) {}

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
                $trackingIds['googleid'] = array_map('trim', explode(',', $data['googleid']));
            } else {
                unset($trackingIds['googleid']);
            }
        }

        if (array_key_exists('tiktokid', $data)) {
            if (! empty($data['tiktokid'])) {
                $trackingIds['tiktokid'] = array_map('trim', explode(',', $data['tiktokid']));
            } else {
                unset($trackingIds['tiktokid']);
                unset($trackingIds['tiktok_pixel_id']);
            }
        }

        if (array_key_exists('tiktok_pixel_id', $data)) {
            if (! empty($data['tiktok_pixel_id'])) {
                $trackingIds['tiktok_pixel_id'] = array_map('trim', explode(',', $data['tiktok_pixel_id']));
            } else {
                unset($trackingIds['tiktok_pixel_id']);
            }
        }

        $payload = [
            'tracking_ids' => $trackingIds,
            'updated_by' => Auth::id(),
        ];

        if (array_key_exists('rac', $data) && $data['rac'] !== null) {
            $payload['rac'] = $data['rac'];
        }

        if (array_key_exists('note', $data)) {
            $payload['note'] = $data['note'];
        }

        $adsLink->update($payload);

        return $adsLink->fresh();
    }
}
