<?php

namespace App\Actions\User;

use App\Models\User;
use App\Models\UserParentChild;

class CreateUserAction
{
    /**
     * @param  array{name: string, email: string, password: string, role_id: int, parent_id?: int|null}  $data
     */
    public function execute(array $data): User
    {
        $password = $data['password'];
        unset($data['password']);

        $parentId = $data['parent_id'] ?? null;
        unset($data['parent_id']);

        $user = User::query()->create([
            ...$data,
            'password' => $password,
        ]);

        if ($parentId !== null && $parentId !== '') {
            UserParentChild::query()->create([
                'parent_user_id' => (int) $parentId,
                'child_user_id' => $user->id,
            ]);
        }

        $user->load(['role', 'assignedParentLink.parentUser']);

        return $user;
    }
}
