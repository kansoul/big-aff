<?php

namespace App\Http\Requests\User;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->route('user');

        return $user instanceof User && ($this->user()?->can('update', $user) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var User $model */
        $model = $this->route('user');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($model->id)],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'role_id' => ['sometimes', 'integer', 'exists:roles,id'],
            'parent_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
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
                /** @var User|null $model */
                $model = $this->route('user');

                if ($auth === null || ! $model instanceof User) {
                    return;
                }

                if (! $this->has('parent_id')) {
                    return;
                }

                $raw = $this->input('parent_id');
                $newParentId = $raw === null || $raw === '' ? null : (int) $raw;

                if (User::assigningParentWouldCycle($model, $newParentId)) {
                    $validator->errors()->add('parent_id', __('validation.in', ['attribute' => 'parent id']));

                    return;
                }

                if ($newParentId === null && ! $auth->managesAllUsers()) {
                    $validator->errors()->add('parent_id', __('validation.required', ['attribute' => 'parent id']));

                    return;
                }

                if ($newParentId !== null && ! $auth->managesAllUsers()) {
                    $allowed = $auth->manageableUserIds();
                    if (! in_array($newParentId, $allowed, true)) {
                        $validator->errors()->add('parent_id', __('validation.in', ['attribute' => 'parent id']));
                    }
                }
            },
        ];
    }
}
