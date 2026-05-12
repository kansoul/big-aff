<?php

namespace App\Http\Resources\Adx;

use App\Models\AdxAccountConversion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AdxAccountConversion
 */
class AdxAccountConversionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'source' => $this->source,
            'account_id' => $this->account_id,
            'conversion_type' => $this->conversion_type,
            'conversion_action_id' => $this->conversion_action_id,
            'name' => $this->name,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
