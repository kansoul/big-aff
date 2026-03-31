<?php

namespace App\Actions\Role;

use App\Models\Role;
use Illuminate\Validation\ValidationException;

class DeleteRoleAction
{
    /**
     * @throws ValidationException
     */
    public function execute(Role $role): void
    {
        if ($role->users()->exists()) {
            throw ValidationException::withMessages([
                'role' => [__('Cannot delete a role that is still assigned to users.')],
            ]);
        }

        $role->delete();
    }
}
