<?php

namespace App\Services\User;

use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Database\Eloquent\Collection;

class UserService
{
    /**
     * Users visible to the actor (full access → all; otherwise self and descendants).
     *
     * @return Collection<int, User>
     */
    public function listForActor(User $auth): Collection
    {
        $query = User::query()
            ->with(['role', 'assignedParentLink.parentUser'])
            ->orderBy('name');

        if (! $auth->managesAllUsers()) {
            $query->whereIn('id', $auth->manageableUserIds());
        }

        return $query->get();
    }

    /**
     * @param  array{name: string, email: string, password: string, role_id: int, parent_id?: int|null}  $data
     */
    public function create(array $data): User
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

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, array $data): User
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

    public function delete(User $user): void
    {
        $user->delete();
    }
}
