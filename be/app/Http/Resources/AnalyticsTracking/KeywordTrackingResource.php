<?php

namespace App\Http\Resources\AnalyticsTracking;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KeywordTrackingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $clickCount = (int) $this->click_count;
        $clickAdCount = (int) $this->click_ad_count;

        return [
            'id' => $this->id,
            'keyword' => $this->keyword,
            'click_count' => $clickCount,
            'click_ad_count' => $clickAdCount,
            'ctr' => $clickCount > 0 ? round(($clickAdCount / $clickCount) * 100, 2) : 0,
        ];
    }
}
