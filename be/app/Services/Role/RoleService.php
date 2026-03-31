<?php

namespace App\Services\Role;

use App\Actions\Role\CreateRoleAction;
use App\Actions\Role\DeleteRoleAction;
use App\Actions\Role\ListRolesAction;
use App\Actions\Role\UpdateRoleAction;
use App\Models\Role;
use Illuminate\Database\Eloquent\Collection;

class RoleService
{
    public function __construct(
        private readonly ListRolesAction $listRolesAction,
        private readonly CreateRoleAction $createRoleAction,
        private readonly UpdateRoleAction $updateRoleAction,
        private readonly DeleteRoleAction $deleteRoleAction
    ) {}

    /**
     * @return Collection<int, Role>
     */
    public function list(): Collection
    {
        return $this->listRolesAction->execute();
    }

    /**
     * @param  array{name: string, permission_mask?: int}  $data
     */
    public function create(array $data): Role
    {
        return $this->createRoleAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Role $role, array $data): Role
    {
        return $this->updateRoleAction->execute($role, $data);
    }

    public function delete(Role $role): void
    {
        $this->deleteRoleAction->execute($role);
    }
}
