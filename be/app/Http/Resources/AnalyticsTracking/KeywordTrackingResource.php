<?php

namespace App\Http\Resources\AnalyticsTracking;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KeywordTrackingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $clickCount = (int) $this->click_count;
        $redirectCount = (int) $this->redirect_count;

        return [
            'id' => $this->id,
            'keyword' => $this->keyword,
            'click_count' => $clickCount,
            'redirect_count' => $redirectCount,
            'ctr' => $clickCount > 0 ? round(($redirectCount / $clickCount) * 100, 2) : 0,
        ];
    }
}
