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
        $user = $this->user();

        return $user !== null && $user->hasPermissionFlag(Permission::SettingsRolesCreate);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('roles', 'name')->whereNull('deleted_at')],
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
