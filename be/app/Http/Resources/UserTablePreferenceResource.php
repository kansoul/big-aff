<?php

namespace App\Http\Resources;

use App\Models\UserTablePreference;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin UserTablePreference
 */
class UserTablePreferenceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'table_name' => $this->table_name,
            'toggled_columns' => $this->toggled_columns ?? [],
            'additional_settings' => $this->additional_settings ?? [],
            'updated_at' => $this->updated_at,
        ];
    }
}
