<?php

namespace App\Actions\Tracking;

use App\Models\AdsLink;

class GetAdsLinkTrackingConfigAction
{
    /** @return array{code: string, site_id: int|null, google_account_ids: array<int, string>, tiktok: array<int, array{account_id: string, pixel_id: string}>} */
    public function execute(string $trackingCode): array
    {
        $adsLink = AdsLink::query()
            ->where('tracking_code', $trackingCode)
            ->where('is_hidden', false)
            ->firstOrFail();

        $trackingIds = $adsLink->tracking_ids ?? [];
        $advertiserIds = $trackingIds['tiktokid'] ?? [];
        $pixelIds = $trackingIds['tiktok_pixel_id'] ?? [];
        $tiktok = [];

        foreach ($advertiserIds as $index => $advertiserId) {
            if (isset($pixelIds[$index])) {
                $tiktok[] = [
                    'account_id' => $advertiserId,
                    'pixel_id' => $pixelIds[$index],
                ];
            }
        }

        return [
            'code' => $adsLink->tracking_code,
            'site_id' => $adsLink->site_id,
            'google_account_ids' => $trackingIds['googleid'] ?? [],
            'tiktok' => $tiktok,
        ];
    }
}
