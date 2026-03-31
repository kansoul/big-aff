<?php

namespace App\Actions\Role;

use App\Models\Role;

class CreateRoleAction
{
    /**
     * @param  array{name: string, permission_mask?: int}  $data
     */
    public function execute(array $data): Role
    {
        return Role::query()->create($data);
    }
}
