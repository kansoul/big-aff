<?php

namespace App\Actions\AdsLink;

use App\Models\AdsLink;
use Illuminate\Support\Facades\Auth;

class ToggleHideAdsLinkAction
{
    public function execute(AdsLink $adsLink): AdsLink
    {
        $adsLink->update([
            'is_hidden' => ! $adsLink->is_hidden,
            'updated_by' => Auth::id(),
        ]);

        return $adsLink->fresh();
    }
}
