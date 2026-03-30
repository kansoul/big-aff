<?php

namespace App\Http\Resources;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property-read Role|null $role
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $mask = (int) ($this->role?->permission_mask ?? 0);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'permission_mask' => $mask,
        ];
    }
}
