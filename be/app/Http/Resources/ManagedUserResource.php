<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * User payload for Settings → Users CRUD (includes role and parent summary).
 *
 * @property int $id
 * @property string $name
 * @property string $email
 * @property int|null $role_id
 * @property int|null $parent_id
 */
class ManagedUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role_id' => $this->role_id,
            'role' => $this->whenLoaded('role', function () {
                if ($this->role === null) {
                    return null;
                }

                return [
                    'id' => $this->role->id,
                    'name' => $this->role->name,
                    'permission_mask' => (int) $this->role->permission_mask,
                ];
            }),
            'parent_id' => $this->parent_id,
            'parent' => $this->whenLoaded('parent', function () {
                if ($this->parent === null) {
                    return null;
                }

                return [
                    'id' => $this->parent->id,
                    'name' => $this->parent->name,
                ];
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
