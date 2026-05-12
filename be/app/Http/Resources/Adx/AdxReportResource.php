<?php

namespace App\Http\Resources\Adx;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdxReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return parent::toArray($request);
    }
}
