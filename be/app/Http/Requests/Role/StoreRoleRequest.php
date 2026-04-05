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
            'permissions' => ['sometimes', 'array', 'max:500'],
            'permissions.*' => ['string', 'max:191', Rule::in(Permission::values())],
        ];
    }
}
