<?php

namespace App\Http\Resources\MainTeam;

use App\Models\MainTeam;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MainTeam
 */
class MainTeamResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'sync_campaign_reports' => $this->sync_campaign_reports,
            'accounts_count' => $this->whenCounted('accounts'),
            'accounts' => $this->whenLoaded('accounts', fn () => $this->accounts->map(fn ($account) => [
                'id' => $account->id,
                'account_id' => $account->account_id,
                'account_name' => $account->account_name,
                'ads_type' => $account->ads_type,
                'status' => $account->status,
            ])),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
