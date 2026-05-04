<?php

namespace App\Actions\AdsLink;

use App\Models\AdsLink;
use App\Support\OwnerResource\AdsLinkOwnerResource;
use Illuminate\Support\Facades\Auth;

class ToggleHideAdsLinkAction
{
    public function execute(AdsLink $adsLink): AdsLink
    {
        (new AdsLinkOwnerResource)->authorize($adsLink);

        $adsLink->update([
            'is_hidden' => ! $adsLink->is_hidden,
            'updated_by' => Auth::id(),
        ]);

        return $adsLink->fresh();
    }
}
