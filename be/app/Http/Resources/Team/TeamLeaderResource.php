<?php

namespace App\Http\Resources\Team;

use App\Http\Resources\User\UserOptionResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 *
 * @property int $id
 * @property string $name
 * @property string $email
 */
class TeamLeaderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'assigned_users' => UserOptionResource::collection($this->whenLoaded('children')),
        ];
    }
}
