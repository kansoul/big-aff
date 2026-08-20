<?php

namespace App\Actions\Tracking;

use App\Enums\LinkStatus;
use App\Models\Link;

class GetLinkTrackingConfigAction
{
    /** @return array{code: string, link_id: int, url: string} */
    public function execute(string $trackingCode): array
    {
        $link = Link::query()
            ->where('tracking_code', $trackingCode)
            ->where('status', LinkStatus::ACTIVE)
            ->firstOrFail();

        return ['code' => $link->tracking_code, 'link_id' => $link->id, 'url' => $link->url];
    }
}
