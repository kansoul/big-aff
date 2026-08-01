<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PixelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'account_id' => $this->account_id,
            'pixel_id' => $this->pixel_id,
            'name' => $this->name,
            'account' => $this->whenLoaded('account', fn () => [
                'id' => $this->account->id,
                'account_id' => $this->account->account_id,
                'account_name' => $this->account->account_name,
                'ads_type' => $this->account->ads_type,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
