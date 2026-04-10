<?php

namespace App\Http\Resources;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Account
 */
class AccountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'business_center_id' => $this->business_center_id,
            'business_center' => $this->whenLoaded('businessCenter', fn() => [
                'id' => $this->businessCenter?->id,
                'name' => $this->businessCenter?->name,
            ]),
            'team_id' => $this->team_id,
            'team' => $this->whenLoaded('team', fn() => [
                'id' => $this->team?->id,
                'name' => $this->team?->name,
            ]),
            'account_id' => $this->account_id,
            'account_name' => $this->account_name,
            'ads_type' => $this->ads_type,
            'status' => $this->status,
            'is_special' => $this->is_special,
            'sync_to_mcc' => $this->sync_to_mcc,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
