<?php

namespace App\Http\Requests\User;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', User::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $auth = $this->user();
        $requiresParent = $auth !== null && ! $auth->managesAllUsers();

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'parent_id' => [
                $requiresParent ? 'required' : 'nullable',
                'integer',
                'exists:users,id',
            ],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $auth = $this->user();
                if ($auth === null) {
                    return;
                }

                $parentId = $this->input('parent_id');
                if ($parentId === null || $parentId === '') {
                    if (! $auth->managesAllUsers()) {
                        $validator->errors()->add('parent_id', __('validation.required', ['attribute' => 'parent id']));
                    }

                    return;
                }

                $parentId = (int) $parentId;

                if (! $auth->managesAllUsers()) {
                    $allowed = $auth->manageableUserIds();
                    if (! in_array($parentId, $allowed, true)) {
                        $validator->errors()->add('parent_id', __('validation.in', ['attribute' => 'parent id']));
                    }
                }
            },
        ];
    }
}
