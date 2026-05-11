<?php

namespace App\Http\Resources\Adx;

use App\Models\AdxConversion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AdxConversion
 */
class AdxConversionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event_id' => $this->event_id,
            'adx_link_data_id' => $this->adx_link_data_id,
            'source' => $this->source,
            'account_id' => $this->account_id,
            'campaign_id' => $this->campaign_id,
            'conversion_type' => $this->conversion_type,
            'conversion_action_id' => $this->conversion_action_id,
            'conversion_value' => $this->conversion_value,
            'currency' => $this->currency,
            'occurred_at' => $this->occurred_at,
            'sync_status' => $this->sync_status,
            'synced_at' => $this->synced_at,
            'error_message' => $this->error_message,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
