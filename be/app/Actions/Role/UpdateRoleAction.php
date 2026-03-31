<?php

namespace App\Actions\Role;

use App\Models\Role;

class UpdateRoleAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Role $role, array $data): Role
    {
        if ($data !== []) {
            $role->update($data);
        }

        return $role->fresh();
    }
}
