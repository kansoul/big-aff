<?php

namespace App\Http\Resources\AnalyticsTracking;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KeywordTrackingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'keywords' => $this->keywords ?? [],
            'keywords_count' => count($this->keywords ?? []),
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
