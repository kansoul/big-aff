<?php

namespace App\Actions\AdsLink;

use App\Models\AdsLink;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\Auth;

class UpdateAdsLinkAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(AdsLink $adsLink, array $data): AdsLink
    {
        OwnershipFilter::forAuthUser()->authorize($adsLink->created_by);

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

        $adsLink->update($payload);

        return $adsLink->fresh();
    }
}
