<?php

namespace App\Http\Resources\User;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 *
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
        /** @var User $user */
        $user = $this->resource;
        $user->loadMissing(['role', 'teams']);
        $roles = $user->teams->pluck('team_role')->toArray();
        $permissions = $user->role?->getPermissionSlugs() ?? [];

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'permissions' => $permissions,
            'is_admin' => $this->is_admin,
            'roles' => $roles,
        ];
    }
}
