<?php

namespace App\Http\Requests\Team;

use App\Enums\TeamRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignTeamRequest extends FormRequest
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
            'user_ids' => ['present', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'team_role' => ['nullable', 'string', Rule::in(TeamRole::values())],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function messages(): array
    {
        return [
            'user_ids.required' => 'User IDs are required',
            'user_ids.*.required' => 'User ID is required',
            'user_ids.*.integer' => 'User ID must be an integer',
            'user_ids.*.exists' => 'User ID does not exist',
        ];
    }
}
