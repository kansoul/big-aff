<?php

namespace App\Http\Resources;

use App\Enums\Permission;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property int $permission_mask
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class RoleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $mask = (int) $this->permission_mask;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'permission_mask' => $mask,
            'permissions' => Permission::expandMaskToNames($mask),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
