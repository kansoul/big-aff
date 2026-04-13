<?php

namespace App\Http\Requests\Role;

use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('roles', 'name')->whereNull('deleted_at')],
            'permissions' => ['sometimes', 'array', 'max:500'],
            'permissions.*' => ['string', 'max:191', Rule::in($this->allowedPermissionValues())],
        ];
    }

    /**
     * Returns allowed permission values for this user.
     * Admin users may assign any permission; others are limited to their own permissions.
     *
     * @return list<string>
     */
    private function allowedPermissionValues(): array
    {
        $user = $this->user();

        if ($user->is_admin) {
            return Permission::values();
        }

        $user->loadMissing('role');
        $mask = $user->role?->getPermissionMask() ?? '0';

        return Permission::maskToSlugs($mask);
    }
}
