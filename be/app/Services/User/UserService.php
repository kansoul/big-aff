<?php

namespace App\Services\User;

use App\Models\User;
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
        $query = User::query()->with(['role', 'parent:id,name'])->orderBy('name');

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

        $user = User::query()->create([
            ...$data,
            'password' => $password,
        ]);

        $user->load(['role', 'parent:id,name']);

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

        if ($data !== []) {
            $user->update($data);
        }

        $user->load(['role', 'parent:id,name']);

        return $user->fresh();
    }

    public function delete(User $user): void
    {
        $user->delete();
    }
}
