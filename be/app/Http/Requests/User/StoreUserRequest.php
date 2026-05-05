<?php

namespace App\Http\Requests\User;

use App\Enums\Permission;
use App\Enums\TeamRole;
use App\Models\TeamUser;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreUserRequest extends FormRequest
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
        $auth = $this->user();
        $requiresParent = $auth !== null && ! $auth->managesAllUsers();

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'team_id' => ['nullable', 'integer', 'exists:teams,id'],
        ];

        if ($auth && ($auth->is_admin || $auth->hasPermissionFlag(Permission::StylesView))) {
            $rules['style_id'] = ['nullable', 'integer', 'exists:styles,id'];
        }

        return $rules;
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $auth = $this->user();
                if ($auth === null || $auth->managesAllUsers()) {
                    return;
                }

                // If auth user is a manager of multiple teams, team_id is required
                $managerTeamIds = TeamUser::query()
                    ->where('user_id', $auth->id)
                    ->where('team_role', TeamRole::MANAGER)
                    ->pluck('team_id')
                    ->all();

                // Validation logic removed as per user request to turn off required field.
                // The team_id is now optional even if managing multiple teams.
            },
        ];
    }
}
