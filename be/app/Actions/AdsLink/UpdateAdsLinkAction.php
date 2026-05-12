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

        if (array_key_exists('fbid', $data)) {
            if (! empty($data['fbid'])) {
                $trackingIds['fbid'] = array_map('trim', explode(',', $data['fbid']));
            } else {
                unset($trackingIds['fbid']);
            }
        }

        if (array_key_exists('googleid', $data)) {
            if (! empty($data['googleid'])) {
                $trackingIds['googleid'] = array_map('trim', explode(',', $data['googleid']));
            } else {
                unset($trackingIds['googleid']);
            }
        }

        $payload = [
            'tracking_ids' => $trackingIds,
            'updated_by' => Auth::id(),
        ];

        if (array_key_exists('rac', $data) && $data['rac'] !== null) {
            $payload['rac'] = $data['rac'];
        }

        if (array_key_exists('keyword_set_id', $data)) {
            $payload['keyword_set_id'] = $data['keyword_set_id'];
        }

        if ($adsLink->is_old && array_key_exists('channel_code', $data)) {
            $payload['channel_code'] = $data['channel_code'];
        }

        if (array_key_exists('note', $data)) {
            $payload['note'] = $data['note'];
        }

        $adsLink->update($payload);

        return $adsLink->fresh();
    }
}
