<?php

namespace App\Http\Resources\Adx;

use App\Models\AdxAccount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AdxAccount
 */
class AdxAccountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'business_center_id' => $this->business_center_id,
            'business_center' => $this->whenLoaded('businessCenter', fn () => [
                'id' => $this->businessCenter?->id,
                'name' => $this->businessCenter?->name,
            ]),
            'team_id' => $this->team_id,
            'team' => $this->whenLoaded('team', fn () => [
                'id' => $this->team?->id,
                'name' => $this->team?->name,
            ]),
            'main_team_id' => $this->main_team_id,
            'main_team' => $this->whenLoaded('mainTeam', fn () => [
                'id' => $this->mainTeam?->id,
                'name' => $this->mainTeam?->name,
            ]),
            'source' => $this->source,
            'account_id' => $this->account_id,
            'account_name' => $this->account_name,
            'status' => $this->status,
            'is_special' => (bool) $this->is_special,
            'sync_to_mcc' => (bool) $this->sync_to_mcc,
            'user_id' => $this->relationLoaded('users') ? $this->users->first()?->id : null,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
