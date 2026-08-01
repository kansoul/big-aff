<?php

namespace App\Services\User;

use App\Actions\User\CreateUserAction;
use App\Actions\User\DeleteUserAction;
use App\Actions\User\ListUsersAction;
use App\Actions\User\UpdateUserAction;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class UserService
{
    public function __construct(
        private readonly ListUsersAction $listUsersAction,
        private readonly CreateUserAction $createUserAction,
        private readonly UpdateUserAction $updateUserAction,
        private readonly DeleteUserAction $deleteUserAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listUsersAction->execute($filters);
    }

    /**
     * @param  array{name: string, email: string, password: string, role_id: int, parent_id?: int|null}  $data
     */
    public function create(array $data): User
    {
        return $this->createUserAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, array $data): User
    {
        return $this->updateUserAction->execute($user, $data);
    }

    public function delete(User $user): void
    {
        $this->deleteUserAction->execute($user);
    }
}
