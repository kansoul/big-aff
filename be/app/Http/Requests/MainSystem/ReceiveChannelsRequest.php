<?php

namespace App\Http\Requests\MainSystem;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveChannelsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'main_team_id' => ['required', 'integer', 'exists:main_teams,id'],
            'channels' => ['required', 'array'],
            'channels.*.code' => ['required', 'string', 'max:100'],
            'channels.*.name' => ['required', 'string', 'max:255'],
            'channels.*.is_active' => ['nullable', 'boolean'],
        ];
    }
}
