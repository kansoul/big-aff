<?php

namespace App\Actions\User;

use App\Models\User;
use App\Models\UserParentChild;

class UpdateUserAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $user, array $data): User
    {
        if (array_key_exists('password', $data) && ($data['password'] === null || $data['password'] === '')) {
            unset($data['password']);
        }

        if (array_key_exists('parent_id', $data)) {
            $parentId = $data['parent_id'];
            unset($data['parent_id']);

            UserParentChild::query()->where('child_user_id', $user->id)->delete();

            if ($parentId !== null && $parentId !== '') {
                UserParentChild::query()->create([
                    'parent_user_id' => (int) $parentId,
                    'child_user_id' => $user->id,
                ]);
            }
        }

        if ($data !== []) {
            $user->update($data);
        }

        $user->load(['role', 'assignedParentLink.parentUser']);

        return $user->fresh();
    }
}
