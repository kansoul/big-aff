<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InactiveStyleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->id,
            'style_id' => $this->style_id,
            'style_code' => $this->style_code,
            'style_name' => $this->style_name,
            'style_updated_at' => $this->style_updated_at,
            'user_name' => $this->user_name,
            'user_email' => $this->user_email,
            'last_revenue_date' => $this->last_revenue_date,
        ];
    }
}
