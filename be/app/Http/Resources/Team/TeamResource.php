<?php

namespace App\Http\Resources\Team;

use App\Http\Resources\User\UserOptionResource;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Team
 */
class TeamResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $users = $this->users;
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'users_count' => $users->count(),
            'users' => UserOptionResource::collection($users),
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
