<?php

namespace App\Http\Requests\Role;

use App\Enums\Permission;
use App\Models\Role;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            return false;
        }

        $wantsName = $this->has('name');
        $wantsPermissions = $this->has('permission_mask');

        if (! $wantsName && ! $wantsPermissions) {
            return false;
        }

        if ($wantsName && ! $user->hasPermissionFlag(Permission::SettingsRolesUpdate)) {
            return false;
        }

        if ($wantsPermissions && ! $user->hasPermissionFlag(Permission::SettingsRolesAssign)) {
            return false;
        }

        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Role $role */
        $role = $this->route('role');

        return [
            'name' => [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('roles', 'name')
                    ->ignore($role->id)
                    ->whereNull('deleted_at'),
            ],
            'permission_mask' => ['sometimes', 'integer', 'min:0', $this->permissionMaskRule()],
        ];
    }

    /**
     * @return \Closure(string, mixed, \Closure(string): void): void
     */
    private function permissionMaskRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_int($value) && ! is_numeric($value)) {
                return;
            }
            $mask = (int) $value;
            $allowed = Permission::fullMask();
            if (($mask & ~$allowed) !== 0) {
                $fail(__('validation.in', ['attribute' => $attribute]));
            }
        };
    }
}
